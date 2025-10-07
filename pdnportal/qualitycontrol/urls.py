from django.urls import path
from . import views

urlpatterns = [
    path('', views.quality_control_home, name='quality_control_home'),
    path('cancel-trial-run/<int:trial_run_id>/', views.cancel_trial_run, name='cancel_trial_run'),
    path('cancel-lot-out/<int:lot_out_id>/', views.cancel_lot_out, name='cancel_lot_out'),
    path('cancel-cut-away/<int:cut_away_id>/', views.cancel_cut_away, name='cancel_cut_away'),
    path('qa-cut-away/<int:cut_away_id>/', views.qa_cut_away, name='qa_cut_away'),
    path('search-trial-runs/', views.search_trial_runs, name='search_trial_runs'),
    path('search-lot-out/', views.search_lot_out, name='search_lot_out'),
    path('export-trial-run-report/', views.export_trial_run_report, name='export_trial_run_report'),
    path('export-lot-out-report/', views.export_lot_out_report, name='export_lot_out_report'),
]
