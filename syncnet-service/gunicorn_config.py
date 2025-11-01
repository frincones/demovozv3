"""
Gunicorn configuration for SyncNet Flask service in production
"""

import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"

# Worker processes
workers = 2  # SyncNet es CPU-intensive, 2 workers es suficiente
worker_class = "sync"  # Sync workers para procesamiento bloqueante
threads = 1  # 1 thread por worker (SyncNet no es thread-safe)

# Timeouts
timeout = 120  # 2 minutos (SyncNet tarda 30-45s por video)
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"  # Log a stdout
errorlog = "-"   # Log a stderr
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "syncnet-service"

# Server mechanics
daemon = False
pidfile = None
user = None
group = None
tmp_upload_dir = None

# Worker lifecycle
max_requests = 1000  # Reiniciar worker después de N requests (libera memoria)
max_requests_jitter = 50  # Jitter para evitar restart simultáneo
preload_app = False  # No precargar app (modelos se cargan por worker)

# Security
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

def pre_fork(server, worker):
    """Called just before a worker is forked"""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked"""
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def pre_exec(server):
    """Called just before a new master process is forked"""
    server.log.info("Forked child, re-executing.")

def when_ready(server):
    """Called just after the server is started"""
    server.log.info("Server is ready. Spawning workers")

def worker_int(worker):
    """Called when a worker receives a SIGINT or SIGQUIT signal"""
    worker.log.info("Worker received INT or QUIT signal")

def worker_abort(worker):
    """Called when a worker receives a SIGABRT signal"""
    worker.log.info("Worker received SIGABRT signal")
