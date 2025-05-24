"""
Database router for handling database connections more efficiently.
This helps prevent "database is locked" errors in SQLite.
"""

import threading
import time
import random
from django.db import connections, OperationalError

# Thread-local storage for connection state
_thread_local = threading.local()

class RetryingRouter:
    """
    A database router that implements connection retry logic for SQLite.
    This helps prevent "database is locked" errors by retrying operations
    with exponential backoff.
    """
    
    def db_for_read(self, model, **hints):
        """
        Suggest the database that should be used for read operations.
        """
        return 'default'
    
    def db_for_write(self, model, **hints):
        """
        Suggest the database that should be used for write operations.
        """
        return 'default'
    
    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if both objects are in the default database.
        """
        return True
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Allow migrations on the default database.
        """
        return True

def retry_on_db_lock(func):
    """
    Decorator to retry database operations when SQLite database is locked.
    Uses exponential backoff with jitter for retries.
    """
    def wrapper(*args, **kwargs):
        max_retries = 5
        retry_count = 0
        base_delay = 0.1  # 100ms initial delay
        
        while True:
            try:
                return func(*args, **kwargs)
            except OperationalError as e:
                if "database is locked" not in str(e) or retry_count >= max_retries:
                    raise
                
                # Calculate delay with exponential backoff and jitter
                delay = base_delay * (2 ** retry_count) + random.uniform(0, 0.1)
                time.sleep(delay)
                retry_count += 1
                
                # Close and reopen connection
                for conn in connections.all():
                    conn.close_if_unusable_or_obsolete()
    
    return wrapper
