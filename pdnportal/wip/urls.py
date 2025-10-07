from django.urls import path
from . import views
from .unchecked_entries_api import unchecked_entries

urlpatterns = [
    path('', views.dashboard, name='wip_dashboard'),
    path('create-session/', views.create_session, name='wip_create_session'),
    path('session/<int:session_id>/', views.session_details, name='session_details'),
    path('session/<int:session_id>/edit/', views.edit_session, name='edit_session'),
    path('session/<int:session_id>/delete/', views.delete_session, name='delete_session'),
    path('session/<int:session_id>/check/', views.check_session, name='check_session'),
    path('line/<int:line_id>/sessions/', views.line_sessions, name='line_sessions'),
    
    # AJAX endpoints
    path('api/products/', views.get_products, name='get_products'),
    path('api/processes/', views.get_processes, name='get_processes'),
    path('api/materials/', views.get_materials, name='get_materials'),
    
    # Entry management
    path('session/<int:session_id>/add-raw-materials/', views.add_raw_materials, name='add_raw_materials'),
    path('session/<int:session_id>/add-finished-products/', views.add_finished_products, name='add_finished_products'),
    path('session/<int:session_id>/add-wip-products/', views.add_wip_products, name='add_wip_products'),
    path('entry/<int:entry_id>/update/', views.update_entry, name='update_entry'),
    path('entry/<int:entry_id>/delete/', views.delete_entry, name='delete_entry'),
    path('entry/<int:entry_id>/mark_checked/', views.mark_entry_checked, name='mark_entry_checked'),
    path('session/<int:session_id>/claim/', views.claim_session, name='claim_session'),
    path('session/<int:session_id>/unchecked-entries/', unchecked_entries, name='unchecked_entries'),
    path('check-session/<int:session_id>/', views.check_session, name='check_session'),

    # Admin URLs
    path('admin/', views.admin_dashboard, name='admin_dashboard'),
    
    # Export Templates
    path('admin/export/masterlist-template/', views.export_masterlist_template, name='export_masterlist_template'),
    path('admin/export/products-template/', views.export_products_template, name='export_products_template'),
    path('admin/export/inventory-data/', views.export_inventory_data, name='export_inventory_data'),
    
    # Import Functions
    path('admin/import/masterlist/', views.import_masterlist, name='import_masterlist'),
    path('admin/import/products/', views.import_products, name='import_products'),
    
    # CRUD Operations
    path('admin/create/material/', views.create_material, name='create_material'),
    path('admin/create/product/', views.create_product, name='create_product'),
    path('admin/create/process/', views.create_process, name='create_process'),
    
    path('admin/update/<str:item_type>/<int:item_id>/', views.update_item, name='update_item'),
    path('admin/delete/<str:item_type>/<int:item_id>/', views.delete_item, name='delete_item'),
    
    # Admin API endpoints
    path('admin/search/', views.search_data, name='search_data'),
    path('admin/api/materials/', views.get_all_materials, name='get_all_materials'),
    path('admin/api/products/', views.get_all_products, name='get_all_products'),
    path('admin/api/processes/', views.get_all_processes, name='get_all_processes'),
    path('admin/api/check-unverified-sessions/', views.check_unverified_sessions, name='check_unverified_sessions'),
    path('admin/debug/permissions/', views.debug_user_permissions, name='debug_user_permissions'),
    path('session/<int:session_id>/checking-complete/', views.checking_complete, name='checking_complete'),
    path('admin/api/product-detail/<int:product_id>/', views.product_detail_api, name='admin_product_detail'),
]