from django.utils import timezone
from datetime import datetime
from django.db import models
from .models import StockDeclaration, StockDeclarationView


def stock_notifications(request):

    notifications = []
    user_has_stock_declarations = False
    
    # Only check for authenticated users with a line assigned
    if request.user.is_authenticated and hasattr(request.user, 'line') and request.user.line.exists():
        user_lines = request.user.line.all()
        
        # Get stock declarations where at least one line matches user's lines
        # Exclude cancelled and already received declarations
        stock_declarations = StockDeclaration.objects.filter(
            lines__in=user_lines,
            received_by_production=False
        ).exclude(
            status='cancelled'
        ).distinct().select_related('created_by').prefetch_related('lines')
        
        viewed_declaration_ids = StockDeclarationView.objects.filter(
            user=request.user
        ).values_list('stock_declaration_id', flat=True)
        
        unviewed_declarations = stock_declarations.exclude(id__in=viewed_declaration_ids)

        user_has_stock_declarations = unviewed_declarations.exists()

        for declaration in unviewed_declarations:
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

        order_map = {'out_of_stock': 0, 'critical': 1, 'overstock': 2}
        notifications.sort(key=lambda n: (order_map.get(n['stock_type_value'], 99), n['created_at']))
    
    # Check if we're on the stock declaration home page
    on_stock_declaration_page = request.path.startswith('/stock-declaration/')
    
    return {
        'stock_notifications': notifications,
        'has_stock_notifications': len(notifications) > 0,
        'user_has_stock_declarations': user_has_stock_declarations,
        'on_stock_declaration_page': on_stock_declaration_page,
    }
