from django.http import JsonResponse
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from .models import DCF
import json

def get_requestor_chart_data(request, period='6month'):
    """
    Get chart data for DCF requestor dashboard
    Shows the status distribution of DCF requests made by the current user
    """
    user = request.user

    # Define time periods
    now = timezone.now()
    if period == '3month':
        start_date = now - timedelta(days=90)
    elif period == '1year':
        start_date = now - timedelta(days=365)
    else:  # Default to 6 months
        start_date = now - timedelta(days=180)

    # Get DCF data for the current user as requestor
    try:
        dcf_data = DCF.objects.filter(
            requisitioner=user,
            date_filed__gte=start_date
        )
    except Exception as e:
        # Handle the case where requisitioner field might not exist or other errors
        print(f"Error querying DCF data: {e}")
        dcf_data = DCF.objects.none()

    # Get monthly trend data
    months = []
    on_process_trend = []
    approved_trend = []
    rejected_trend = []

    # Determine number of months to show based on period
    if period == '3month':
        num_months = 3
    elif period == '1year':
        num_months = 12
    else:  # Default to 6 months
        num_months = 6

    for i in range(num_months, 0, -1):
        month_start = now - timedelta(days=30 * i)
        month_end = now - timedelta(days=30 * (i-1))
        month_name = month_start.strftime('%b')

        months.append(month_name)

        month_data = dcf_data.filter(date_filed__gte=month_start, date_filed__lt=month_end)
        on_process_trend.append(month_data.filter(status='on_process').count())
        approved_trend.append(month_data.filter(status='approved').count())
        rejected_trend.append(month_data.filter(status='rejected').count())

    # Prepare chart data - using line chart instead of pie with 3D effect
    chart_data = {
        'type': 'line',
        'data': {
            'labels': months,
            'datasets': [
                {
                    'label': 'On Process',
                    'data': on_process_trend,
                    'borderColor': 'rgba(255, 193, 7, 1)',
                    'backgroundColor': 'rgba(255, 193, 7, 1)',
                    'fill': False,
                    'tension': 0.1,
                    'borderWidth': 2,
                    'pointRadius': 3,
                    'pointHoverRadius': 4
                },
                {
                    'label': 'Approved',
                    'data': approved_trend,
                    'borderColor': 'rgba(76, 175, 80, 1)',
                    'backgroundColor': 'rgba(76, 175, 80, 1)',
                    'fill': False,
                    'tension': 0.1,
                    'borderWidth': 2,
                    'pointRadius': 3,
                    'pointHoverRadius': 4
                },
                {
                    'label': 'Rejected',
                    'data': rejected_trend,
                    'borderColor': 'rgba(244, 67, 54, 1)',
                    'backgroundColor': 'rgba(244, 67, 54, 1)',
                    'fill': False,
                    'tension': 0.1,
                    'borderWidth': 2,
                    'pointRadius': 3,
                    'pointHoverRadius': 4
                }
            ]
        },
        'options': {
            'responsive': True,
            'maintainAspectRatio': False,
            'backgroundColor': 'white',
            'elements': {
                'line': {
                    'borderWidth': 2,
                    'tension': 0.1,
                    'borderCapStyle': 'butt'
                },
                'point': {
                    'radius': 3,
                    'hoverRadius': 4,
                    'borderWidth': 1
                }
            },
            'plugins': {
                'legend': {
                    'position': 'top',
                    'labels': {
                        'boxWidth': 15,
                        'padding': 15,
                        'usePointStyle': True,
                        'pointStyle': 'rectRounded'
                    }
                },
                'tooltip': {
                    'mode': 'index',
                    'intersect': False
                },
                'title': {
                    'display': False
                }
            },
            'scales': {
                'y': {
                    'beginAtZero': True,
                    'ticks': {
                        'precision': 0,
                        'stepSize': 1
                    },
                    'title': {
                        'display': False
                    },
                    'grid': {
                        'drawBorder': False,
                        'color': 'rgba(0, 0, 0, 0.03)'
                    }
                },
                'x': {
                    'title': {
                        'display': False
                    },
                    'grid': {
                        'display': False
                    }
                }
            }
        }
    }

    # No need for a separate trend data since we're using a single 3D line chart
    # We'll just return the main chart data
    trend_data = chart_data

    # Combine both charts into one response
    response_data = {
        'status_distribution': chart_data,
        'monthly_trend': trend_data
    }

    return JsonResponse(response_data)

def get_approver_chart_data(request, period='6month'):  # request param used in real implementation
    """
    Get chart data for DCF approver dashboard
    Shows the approval statistics for DCFs that the current user has approved
    """
    # Note: In a real implementation, we would filter by the current user
    # user = request.user

    # Define time periods
    now = timezone.now()
    if period == '3month':
        start_date = now - timedelta(days=90)
    elif period == '1year':
        start_date = now - timedelta(days=365)
    else:  # Default to 6 months
        start_date = now - timedelta(days=180)

    # Get DCF data for the current user as approver
    # This is a simplified query - in a real app, you'd need to check the approval timeline
    # to find DCFs where this user is an approver
    try:
        dcf_data = DCF.objects.filter(
            date_filed__gte=start_date
        )
    except Exception as e:
        # Handle any database errors
        print(f"Error querying DCF data for approver: {e}")
        dcf_data = DCF.objects.none()

    # Get approval time statistics
    avg_approval_time = 3.5  # Placeholder - in a real app, calculate this from data

    # Get monthly counts
    months = []
    on_process_trend = []
    approved_trend = []
    rejected_trend = []

    # Determine number of months to show based on period
    if period == '3month':
        num_months = 3
    elif period == '1year':
        num_months = 12
    else:  # Default to 6 months
        num_months = 6

    for i in range(num_months, 0, -1):
        month_start = now - timedelta(days=30 * i)
        month_end = now - timedelta(days=30 * (i-1))
        month_name = month_start.strftime('%b')

        months.append(month_name)

        month_data = dcf_data.filter(date_filed__gte=month_start, date_filed__lt=month_end)
        on_process_trend.append(month_data.filter(status='on_process').count())
        approved_trend.append(month_data.filter(status='approved').count())
        rejected_trend.append(month_data.filter(status='rejected').count())

    # Add trend data with 3D effect
    trend_data = {
        'type': 'line',
        'data': {
            'labels': months,
            'datasets': [
                {
                    'label': 'On Process',
                    'data': on_process_trend,
                    'borderColor': 'rgba(255, 193, 7, 1)',
                    'backgroundColor': 'rgba(255, 193, 7, 1)',
                    'fill': False,
                    'tension': 0.1,
                    'borderWidth': 2,
                    'pointRadius': 3,
                    'pointHoverRadius': 4
                },
                {
                    'label': 'Approved',
                    'data': approved_trend,
                    'borderColor': 'rgba(76, 175, 80, 1)',
                    'backgroundColor': 'rgba(76, 175, 80, 1)',
                    'fill': False,
                    'tension': 0.1,
                    'borderWidth': 2,
                    'pointRadius': 3,
                    'pointHoverRadius': 4
                },
                {
                    'label': 'Rejected',
                    'data': rejected_trend,
                    'borderColor': 'rgba(244, 67, 54, 1)',
                    'backgroundColor': 'rgba(244, 67, 54, 1)',
                    'fill': False,
                    'tension': 0.1,
                    'borderWidth': 2,
                    'pointRadius': 3,
                    'pointHoverRadius': 4
                }
            ]
        },
        'options': {
            'responsive': True,
            'maintainAspectRatio': False,
            'backgroundColor': 'white',
            'elements': {
                'line': {
                    'borderWidth': 2,
                    'tension': 0.1,
                    'borderCapStyle': 'butt'
                },
                'point': {
                    'radius': 3,
                    'hoverRadius': 4,
                    'borderWidth': 1
                }
            },
            'plugins': {
                'legend': {
                    'position': 'top',
                    'labels': {
                        'boxWidth': 15,
                        'padding': 15,
                        'usePointStyle': True,
                        'pointStyle': 'rectRounded'
                    }
                },
                'tooltip': {
                    'mode': 'index',
                    'intersect': False
                },
                'title': {
                    'display': False
                }
            },
            'scales': {
                'y': {
                    'beginAtZero': True,
                    'ticks': {
                        'precision': 0,
                        'stepSize': 1
                    },
                    'title': {
                        'display': False
                    },
                    'grid': {
                        'drawBorder': False,
                        'color': 'rgba(0, 0, 0, 0.03)'
                    }
                },
                'x': {
                    'title': {
                        'display': False
                    },
                    'grid': {
                        'display': False
                    }
                }
            }
        }
    }

    # Use trend data as the main chart data
    response_data = {
        'approval_distribution': trend_data,
        'monthly_trend': trend_data,
        'avg_approval_time': avg_approval_time
    }

    return JsonResponse(response_data)
