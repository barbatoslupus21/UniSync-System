from django.utils import timezone
from .models import CategoryCounter, ECIS

def generate_ecis_number(category_code):
    year = timezone.now().strftime('%y')
    
    counter, created = CategoryCounter.objects.get_or_create(
        category=category_code,
        year=year,
        defaults={'current_sequence': 1}
    )
    
    if not created and counter.year != year:
        counter.year = year
        counter.current_sequence = 1
        counter.save()
    
    ecis_number = f"{category_code}-{year}-{counter.current_sequence:03d}"
    
    counter.current_sequence += 1
    counter.save()
    
    return ecis_number