from django.utils import timezone
from datetime import datetime
from django.db import models
from .models import StockDeclaration


def stock_notifications(request):
    """
    Context processor to check for stock declarations that need user attention.
    Returns notifications for declarations that match the user's line and meet one of:
    - Created today
    - Not yet received by production
    """
    notifications = []
    user_has_stock_declarations = False
    
    # Only check for authenticated users with a line assigned
    if request.user.is_authenticated and hasattr(request.user, 'line') and request.user.line:
        user_line = request.user.line
        today = timezone.now().date()
        
        # Query for stock declarations that meet the conditions
        # Condition 1: Created today OR
        # Condition 2: received_by_production is False
        # AND the user's line is in the lines field
        stock_declarations = StockDeclaration.objects.filter(
            lines=user_line
        ).filter(
            models.Q(created_at__date=today) | models.Q(received_by_production=False)
        ).distinct().select_related('created_by').prefetch_related('lines')
        
        user_has_stock_declarations = StockDeclaration.objects.filter(
            lines=user_line
        ).filter(created_at__date=today, received_by_production=False).distinct().select_related('created_by').prefetch_related('lines').exclude(status='cancelled')

        # Convert to list of dictionaries for template use
        for declaration in stock_declarations:
            notification_data = {
                'id': declaration.id,
                'control_number': declaration.control_number,
                'stock_type': declaration.get_stock_type_display(),
                'stock_type_value': declaration.stock_type,
                'product_number': declaration.product_number,
                'product_name': declaration.product_name,
                'quantity': declaration.quantity,
                'status': declaration.get_status_display(),
                'created_at': declaration.created_at,
            }
            notifications.append(notification_data)

        # Sort notifications so that 'out_of_stock' come first, then 'critical', then 'overstock'
        order_map = {'out_of_stock': 0, 'critical': 1, 'overstock': 2}
        notifications.sort(key=lambda n: (order_map.get(n.get('stock_type_value'), 99), n.get('created_at')))
    
    return {
        'stock_notifications': notifications,
        'has_stock_notifications': len(notifications) > 0,
        'user_has_stock_declarations': user_has_stock_declarations,
    }
