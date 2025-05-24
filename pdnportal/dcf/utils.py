"""
Utility functions for the DCF app.
"""

import time
import random
import functools
from django.db import connections, OperationalError

def retry_on_db_lock(max_retries=5, base_delay=0.1):
    """
    Decorator to retry database operations when SQLite database is locked.
    Uses exponential backoff with jitter for retries.
    
    Args:
        max_retries (int): Maximum number of retry attempts
        base_delay (float): Initial delay in seconds before first retry
        
    Returns:
        Function decorator
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            retry_count = 0
            
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
                    
                    # Close and reopen connections
                    for conn in connections.all():
                        conn.close_if_unusable_or_obsolete()
        
        return wrapper
    return decorator
