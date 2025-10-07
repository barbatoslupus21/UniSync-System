from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import InventorySession, InventoryEntry

@login_required
def unchecked_entries(request, session_id):
    session = InventorySession.objects.get(id=session_id)
    if not request.user.wip_checker:
        return JsonResponse({'success': False, 'message': 'Access denied.'}, status=403)
    unchecked = session.entries.filter(status='FOR_CHECKING')
    entries_list = [
        {
            'id': e.id,
            'type': e.inventory_type,
            'product': getattr(e.product, 'product_number', ''),
            'material': getattr(e.material, 'material_name', '') if e.material else '',
            'process': getattr(e.process, 'process_name', '') if e.process else '',
            'count_tag': e.count_tag,
        }
        for e in unchecked
    ]
    return JsonResponse({'success': True, 'entries': entries_list})
