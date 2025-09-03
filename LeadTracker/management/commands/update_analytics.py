from django.core.management.base import BaseCommand
from Custom_user.models import User
from LeadTracker.models import Client
from django.utils.timezone import now
from datetime import timedelta
from django.core.cache import cache
from django.db.models import Count

class Command(BaseCommand):
    help = 'Update analytics data for all employees'

    def handle(self, *args, **kwargs):
        employees = User.objects.all()
        analytics_data = []

        for employee in employees:
            employee_clients = Client.objects.filter(created_by=employee)
            last_client = employee_clients.order_by('-creation_date').first()

            # Calculate daily record counts for the past 7 days
            last_7_days = [now().date() - timedelta(days=i) for i in range(6, -1, -1)]
            daily_counts_dict = {str(day): 0 for day in last_7_days}

            raw_counts = (
                employee_clients
                .filter(creation_date__date__gte=now() - timedelta(days=7))
                .values('creation_date__date')
                .annotate(count=Count('id'))
            )

            for entry in raw_counts:
                day_str = str(entry['creation_date__date'])
                daily_counts_dict[day_str] = entry['count']

            active_time = None
            if employee.last_login:
                active_time = now() - employee.last_login

            analytics_data.append({
                'employee': employee.username,
                'total_records': employee_clients.count(),
                'last_record': last_client.creation_date if last_client else None,
                'daily_counts': daily_counts_dict,
                'active_time': active_time,
            })

        # Cache the analytics data
        cache.set('analytics_data', analytics_data, timeout=86400)  # Cache for 1 day
        self.stdout.write(self.style.SUCCESS('Successfully updated analytics data.'))
