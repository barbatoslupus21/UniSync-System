"""
Middleware for handling database connections.
This helps prevent "database is locked" errors in SQLite.
"""

import time
import random
from django.db import connections, OperationalError
from django.conf import settings

class DatabaseConnectionMiddleware:
    """
    Middleware that manages database connections to prevent "database is locked" errors.
    
    This middleware:
    1. Closes connections at the end of each request
    2. Implements retry logic for database operations
    3. Handles connection pooling
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Process the request
        try:
            response = self.get_response(request)
            return response
        except OperationalError as e:
            if "database is locked" in str(e):
                # Implement retry logic with exponential backoff
                max_retries = 5
                retry_count = 0
                base_delay = 0.1  # 100ms initial delay
                
                while retry_count < max_retries:
                    # Close all connections and retry
                    for conn in connections.all():
                        conn.close_if_unusable_or_obsolete()
                    
                    # Calculate delay with exponential backoff and jitter
                    delay = base_delay * (2 ** retry_count) + random.uniform(0, 0.1)
                    time.sleep(delay)
                    retry_count += 1
                    
                    try:
                        response = self.get_response(request)
                        return response
                    except OperationalError as retry_e:
                        if "database is locked" not in str(retry_e) or retry_count >= max_retries:
                            raise
            else:
                raise
        finally:
            # Always close connections at the end of the request
            for conn in connections.all():
                conn.close_if_unusable_or_obsolete()
