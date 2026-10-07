"""
Suite de Pruebas Unitarias y de Rendimiento para la Capa de Caché RAG (Ateneo+).
Verifica:
1. Comportamiento Hit/Miss y normalización de llaves SHA-256.
2. Recuperación por similitud léxica (threshold >= 0.98).
3. Desalojo LRU (Least Recently Used) al alcanzar la capacidad máxima.
4. Expiración de entradas por política TTL.
5. Invarianza estricta de resultados (Cold vs Hot).
6. Reducción empírica de latencia a < 50ms en consultas recurrentes.
7. Concurrencia y exclusión mutua thread-safe.
"""
import time
import threading
import pytest
from rag.cache_manager import RAGCacheManager, normalize_text_for_cache
from rag.retriever import retrieve_relevant_chunk, rag_cache_manager


def test_normalize_text_for_cache():
    """Verifica que la normalización sea determinística ante tildes, mayúsculas y espacios."""
    t1 = "  SEPSIS NEONATAL Con Signos De Alarma:   antibioticoterapia parenteral!  "
    t2 = "sepsis neonatal con signos de alarma antibioticoterapia parenteral"
    assert normalize_text_for_cache(t1) == normalize_text_for_cache(t2)


def test_cache_hit_and_miss_exact():
    """Verifica el ciclo de vida básico de inserción y recuperación por clave SHA-256."""
    cache = RAGCacheManager(max_entries=10, ttl_seconds=60, enabled=True)

    # Miss inicial
    assert cache.get("sepsis_neonatal", "shock por sepsis neonatal", 1, "hybrid") is None
    stats = cache.get_stats()
    assert stats["misses"] == 1
    assert stats["hits"] == 0

    # Inserción
    dummy_data = [{"chunk_id": "c1", "texto": "Protocolo sepsis neonatal"}]
    cache.set("sepsis_neonatal", "shock por sepsis neonatal", 1, "hybrid", dummy_data)

    # Hit subsecuente
    cached = cache.get("sepsis_neonatal", "shock por sepsis neonatal", 1, "hybrid")
    assert cached is not None
    assert cached[0]["chunk_id"] == "c1"
    stats = cache.get_stats()
    assert stats["hits"] == 1

    # Hit con mayúsculas y tildes (normalización)
    cached_normalized = cache.get("SEPSIS_NEONATAL", "  SHOCK por SÉPSIS NEONATÁL!  ", 1, "hybrid")
    assert cached_normalized is not None
    assert cached_normalized[0]["chunk_id"] == "c1"
    assert cache.get_stats()["hits"] == 2


def test_lexical_similarity_hit():
    """Verifica que consultas casi idénticas (>= 98% similitud) acierten en caché."""
    cache = RAGCacheManager(max_entries=10, ttl_seconds=60, similarity_threshold=0.98, enabled=True)
    dummy_data = [{"chunk_id": "c2", "texto": "Manejo de preeclampsia severa"}]

    q_original = "manejo de preeclampsia severa con sulfato de magnesio segun guia msp"
    cache.set("preeclampsia", q_original, 1, "hybrid", dummy_data)

    # Consulta con variación de un solo carácter (< 2% de diferencia)
    q_similar = "manejo de preeclampsia severa con sulfato de magnesio segun guia msp."
    cached = cache.get("preeclampsia", q_similar, 1, "hybrid")
    assert cached is not None
    assert cached[0]["chunk_id"] == "c2"


def test_lru_eviction_policy():
    """Verifica que al sobrepasar la capacidad se desaloje el registro menos recientemente usado."""
    cache = RAGCacheManager(max_entries=3, ttl_seconds=60, enabled=True)

    cache.set("g1", "q1", 1, "hybrid", [{"id": "1"}])
    cache.set("g2", "q2", 1, "hybrid", [{"id": "2"}])
    cache.set("g3", "q3", 1, "hybrid", [{"id": "3"}])

    # Acceder a q1 para que sea más reciente que q2
    _ = cache.get("g1", "q1", 1, "hybrid")

    # Insertar q4 -> debe desalojar q2 (el más antiguo no usado)
    cache.set("g4", "q4", 1, "hybrid", [{"id": "4"}])

    assert cache.get("g1", "q1", 1, "hybrid") is not None
    assert cache.get("g2", "q2", 1, "hybrid") is None  # Desalojado por LRU
    assert cache.get("g3", "q3", 1, "hybrid") is not None
    assert cache.get("g4", "q4", 1, "hybrid") is not None
    assert cache.get_stats()["evictions"] == 1


def test_ttl_expiration():
    """Verifica que los registros expiren automáticamente tras el tiempo de vida (TTL)."""
    cache = RAGCacheManager(max_entries=10, ttl_seconds=1, enabled=True)
    cache.set("g1", "q1", 1, "hybrid", [{"id": "temp"}])

    # Inmediato: hit
    assert cache.get("g1", "q1", 1, "hybrid") is not None

    # Esperar expiración
    time.sleep(1.1)

    # Expirado: miss
    assert cache.get("g1", "q1", 1, "hybrid") is None
    assert cache.get_stats()["expired_evictions"] >= 1


def test_thread_safety_concurrent_access():
    """Verifica la estabilidad y ausencia de condiciones de carrera bajo acceso concurrente."""
    cache = RAGCacheManager(max_entries=50, ttl_seconds=60, enabled=True)
    errors = []

    def worker(worker_id: int):
        try:
            for i in range(30):
                q = f"consulta_concurrente_{i % 10}"
                cache.set("guia_test", q, 1, "hybrid", [{"worker": worker_id, "i": i}])
                _ = cache.get("guia_test", q, 1, "hybrid")
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(w,)) for w in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0
    assert cache.get_stats()["current_size"] <= 50


def test_retriever_integration_invariance_and_latency():
    """
    Verifica la integración real con retrieve_relevant_chunk:
    1. Invarianza: El contenido recuperado en frío y en caliente es 100% idéntico.
    2. Latencia: La consulta en caliente tarda menos de 50 milisegundos (< 0.050s).
    """
    rag_cache_manager.clear()
    query = "sulfato de magnesio esquema zuspan preeclampsia severa"
    guia = "MSP_Trastornos-hipertensivos-del-embarazo-con-portada-3.pdf"

    # 1. Consulta en Frío (Cold retrieval - embeddings + BM25 + ChromaDB)
    t0 = time.perf_counter()
    cold_chunk = retrieve_relevant_chunk(query=query, guia_filtro=guia, top_k=1)
    cold_time = time.perf_counter() - t0

    assert cold_chunk is not None
    assert "texto" in cold_chunk
    assert cold_chunk.get("guia_fuente") is not None

    # 2. Consulta en Caliente (Hot retrieval - RAG LRU Cache hit)
    t1 = time.perf_counter()
    hot_chunk = retrieve_relevant_chunk(query=query, guia_filtro=guia, top_k=1)
    hot_time = time.perf_counter() - t1

    # Validación de Invarianza Estricta
    assert cold_chunk["texto"] == hot_chunk["texto"]
    assert cold_chunk["chunk_id"] == hot_chunk["chunk_id"]
    assert cold_chunk.get("pagina") == hot_chunk.get("pagina")
    assert cold_chunk.get("seccion") == hot_chunk.get("seccion")

    # Validación Cuantitativa de Latencia (< 50ms)
    print(f"\n[LATENCY BENCHMARK] Cold Retrieval: {cold_time*1000:.2f}ms | Hot Retrieval: {hot_time*1000:.2f}ms")
    assert hot_time < 0.050, f"Latencia en caliente {hot_time*1000:.2f}ms excedió el umbral de 50ms"
    assert rag_cache_manager.get_stats()["hits"] >= 1


if __name__ == "__main__":
    print("Ejecutando test_normalize_text_for_cache...")
    test_normalize_text_for_cache()
    print("[PASS] Normalización determinística validada.")

    print("Ejecutando test_cache_hit_and_miss_exact...")
    test_cache_hit_and_miss_exact()
    print("[PASS] Ciclo Hit/Miss exacto validado.")

    print("Ejecutando test_lexical_similarity_hit...")
    test_lexical_similarity_hit()
    print("[PASS] Búsqueda por similitud léxica validada.")

    print("Ejecutando test_lru_eviction_policy...")
    test_lru_eviction_policy()
    print("[PASS] Política de desalojo LRU validada.")

    print("Ejecutando test_ttl_expiration...")
    test_ttl_expiration()
    print("[PASS] Expiración TTL validada.")

    print("Ejecutando test_thread_safety_concurrent_access...")
    test_thread_safety_concurrent_access()
    print("[PASS] Concurrencia y seguridad de hilos validada.")

    print("Ejecutando test_retriever_integration_invariance_and_latency...")
    test_retriever_integration_invariance_and_latency()
    print("[PASS] Invarianza y latencia < 50ms validadas.")

    print("\nTODOS LOS TESTS DE CACHÉ RAG APROBADOS AL 100%.")
