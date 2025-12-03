from django.core.management.base import BaseCommand
from manhours.models import Machine, Operators, ManhoursLogsheet
from portalusers.models import Users
from datetime import datetime, timedelta
import random
from decimal import Decimal

class Command(BaseCommand):
    help = 'Add sample manhours data for testing'

    def handle(self, *args, **options):
        # Get existing data
        machines = list(Machine.objects.all())
        operators = list(Operators.objects.all())
        users = list(Users.objects.all())

        if not machines:
            self.stdout.write(self.style.ERROR('No machines found. Please create some machines first.'))
            return

        if not operators:
            self.stdout.write(self.style.ERROR('No operators found. Please create some operators first.'))
            return

        if not users:
            self.stdout.write(self.style.ERROR('No users found. Please create some users first.'))
            return

        # Sample data
        lines = ['Line A', 'Line B', 'Line C', 'Line D', 'Line E']
        shifts = ['AM', 'PM']

        # Create 10 sample entries
        entries_created = 0
        for i in range(10):
            # Random date within the last 30 days
            days_ago = random.randint(0, 30)
            date_completed = datetime.now() - timedelta(days=days_ago)

            # Random data
            operator = random.choice(operators)
            machine = random.choice(machines)
            user = random.choice(users)
            shift = random.choice(shifts)
            line = random.choice(lines)
            setup = random.randint(0, 2)  # 0-2 hours setup
            manhours = Decimal(str(round(random.uniform(4.0, 8.0), 2)))  # 4-8 hours
            output = Decimal(str(round(random.uniform(50, 200), 2)))  # 50-200 units

            # Create entry
            entry = ManhoursLogsheet.objects.create(
                user=user,
                operator=operator.name,  # Store operator name as string
                shift=shift,
                line=line,
                machine=machine,
                setup=setup,
                manhours=manhours,
                output=output,
                date_completed=date_completed
            )

            entries_created += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created entry {entries_created}: {operator.name} - {date_completed.date()} - {shift} - {output} units'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {entries_created} sample manhours entries!')
        )