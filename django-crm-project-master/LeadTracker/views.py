from django.shortcuts import render, redirect, get_object_or_404
from .models import Client, ClientField, FieldTemplate, UserActivity
from .forms import DynamicClientForm, ClientUpdateForm, CustomerEditForm
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, JsonResponse, HttpResponse
from django.urls import reverse
from Custom_user.models import User
from django.db.models import Count, F
from django.db.models.functions import TruncMonth, ExtractHour
from django.utils.timezone import now
from datetime import timedelta
import logging
from django.utils.dateformat import DateFormat
import json
from Custom_user.forms import CustomUserCreationForm
from openpyxl import Workbook
from dateutil.relativedelta import relativedelta  # Import for accurate month calculations

# Configure logging
logger = logging.getLogger(__name__)

@login_required(login_url='/custom_user/login/')
def update_user_activity(user):
    try:
        today = now().date()
        user_activity, created = UserActivity.objects.get_or_create(user=user, date=today)

        # Update record count
        user_activity.record_count = Client.objects.filter(created_by=user, creation_date__date=today).count()

        # Update active hours (ensure last_login is valid)
        if hasattr(user, 'last_login') and user.last_login:
            active_duration = now() - user.last_login
            user_activity.active_hours = max(active_duration.total_seconds() / 3600, 0)  # Ensure non-negative hours
        else:
            user_activity.active_hours = 0  # Default to 0 if last_login is None or invalid

        user_activity.save()
    except Exception as e:
        logger.error(f"Error updating user activity: {e}")
        raise

@login_required(login_url='/custom_user/login/')
def dashboardView(request):
    try:
        # Fetch clients based on user type
        if request.user.is_superuser:
            clients = Client.objects.all()
        else:
            clients = Client.objects.filter(created_by=request.user)

        field_templates = FieldTemplate.objects.all()

        # Check if there are no clients or field templates
        warning_message = None
        if not clients.exists():
            warning_message = "No clients found. Please add some records."
        elif not field_templates.exists():
            warning_message = "No field templates found. Please create field templates."

        return render(request, 'LeadTracker/dashboard.html', {
            'clients': clients,
            'field_templates': field_templates,
            'warning_message': warning_message
        })
    except Exception as e:
        return render(request, 'LeadTracker/dashboard.html', {
            'clients': [],
            'field_templates': [],
            'error': f"An unexpected error occurred: {str(e)}"
        })

@login_required(login_url='/custom_user/login/')
def create_system_user(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            save_client_fields(user, form.cleaned_data)  # Use helper function
            return redirect('dashboard')
    else:
        form = CustomUserCreationForm()
    return render(request, 'LeadTracker/add_user.html', {'form': form})

@login_required(login_url='/custom_user/login/')
def create_client_record(request):
    form = DynamicClientForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        # Create Client with current user then save dynamic fields
        client = Client.objects.create(created_by=request.user)
        for field in FieldTemplate.objects.all():
            value = form.cleaned_data.get(f'field_{field.id}', '')
            ClientField.objects.update_or_create(
                client=client,
                template=field,
                defaults={'value': value}
            )
        return redirect('dashboardView')
    return render(request, 'LeadTracker/create-record.html', {'form': form})

@login_required(login_url='/custom_user/login/')
def update_record(request, record_id):
    record = get_object_or_404(Client, id=record_id)
    form = DynamicClientForm(request.POST or None, instance=record)
    if request.method == 'POST' and form.is_valid():
        form.save()
        return redirect('dashboardView')
    return render(request, 'LeadTracker/edit_record.html', {'form': form})

@login_required(login_url='/custom_user/login/')
def delete_record(request, record_id):
    record = get_object_or_404(Client, id=record_id)
    if request.method == 'POST':
        record.delete()
        return redirect('dashboardView')
    return render(request, 'LeadTracker/delete-record.html', {'record': record})

@login_required(login_url='/custom_user/login/')
def view_customer(request, customer_id):
    customer = get_object_or_404(Client, id=customer_id)
    return render(request, 'LeadTracker/view-customer.html', {'customer': customer})

@login_required(login_url='/custom_user/login/')
def edit_customer(request, customer_id):
    customer = get_object_or_404(Client, id=customer_id, created_by=request.user)  # Ensure the customer belongs to the logged-in user
    form = DynamicClientForm(request.POST or None, instance=customer)
    if request.method == 'POST' and form.is_valid():
        form.save()
        return redirect('customer_detail', customer_id=customer.id)
    return render(request, 'LeadTracker/edit_customer.html', {'form': form})

@login_required(login_url='/custom_user/login/')
def delete_customer(request, customer_id):
    customer = get_object_or_404(Client, id=customer_id)
    if request.method == 'POST':
        customer.delete()
        return redirect('dashboardView')
    return render(request, 'LeadTracker/delete-record.html', {'customer': customer})

@login_required(login_url='/custom_user/login/')
def analytics_view(request):
    if not request.user.is_superuser:
        return redirect('dashboardView')

    # Fetch clients based on user type
    clients = Client.objects.all()

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

        # Monthly data aggregation
        monthly_counts = (
            employee_clients
            .annotate(month=TruncMonth('creation_date'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )

        monthly_counts_dict = {str(entry['month']): entry['count'] for entry in monthly_counts}

        active_time = None
        if employee.last_login:
            active_time = now() - employee.last_login

        analytics_data.append({
            'employee': employee,
            'total_records': employee_clients.count(),
            'last_record': last_client,
            'daily_counts': daily_counts_dict,
            'monthly_counts': monthly_counts_dict,
            'active_time': active_time,
        })

    return render(request, 'LeadTracker/analytics.html', {
        'analytics_data': analytics_data,
        'clients': clients
    })

@login_required(login_url='/custom_user/login/')
def get_user_records(request):
    if (username := request.GET.get('username')):
        try:
            user = User.objects.get(username=username)
            records = Client.objects.filter(created_by=user)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
    else:
        # Tüm kullanıcıların kayıtlarını döndür
        records = Client.objects.all()

    data = {
        'records': [
            {
                'id': record.id,
                'created_by': record.created_by.username,
                'creation_date': record.creation_date.strftime('%Y-%m-%d %H:%M:%S'),
                'details': [
                    {
                        'field_name': field.template.name,
                        'field_value': field.value
                    }
                    for field in record.fields.all()
                ]
            }
            for record in records
        ]
    }
    return JsonResponse(data)

@login_required(login_url='/custom_user/login/')
def create_field_template(request):
    if request.method == 'POST':
        # Logic to handle form submission for creating field templates
        template_name = request.POST.get('template_name')
        if template_name:
            FieldTemplate.objects.create(name=template_name)
            return redirect('dashboardView')
        else:
            return render(request, 'LeadTracker/create-field-template.html', {
                'error': 'Template name is required.'
            })
    return render(request, 'LeadTracker/create-field-template.html')

def index(request):
    return render(request, 'LeadTracker/index.html')

def export_to_excel(request):
    # Get the selected employee's username from the query parameters
    username = request.GET.get('username')

    # Excel çalışma kitabı 
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Detailed Records"

    # Tablo başlıklarını ekle
    headers = ["ID", "Created By", "Creation Date", "Details"]
    worksheet.append(headers)

    # Tablo verilerini ekle
    clients = Client.objects.filter(created_by__username=username) if username else Client.objects.all()
    for client in clients:
        details = ", ".join([f"{field.template.name}: {field.value}" for field in client.fields.all()])
        worksheet.append([
            client.id,
            client.created_by.username,
            client.creation_date.strftime('%Y-%m-%d %H:%M:%S'),
            details
        ])

    # Excel dosyasını indirme 
    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response['Content-Disposition'] = f'attachment; filename={username}_Detailed_Records.xlsx' if username else 'attachment; filename=Detailed_Records.xlsx'
    workbook.save(response)
    return response

@login_required(login_url='/custom_user/login/')
def hourly_records_data(request):
    # Calculate hourly record counts for the past 24 hours
    last_24_hours = [now() - timedelta(hours=i) for i in range(23, -1, -1)]
    hourly_counts = {hour.strftime('%Y-%m-%d %H:00'): 0 for hour in last_24_hours}

    raw_counts = (
        Client.objects.filter(creation_date__gte=now() - timedelta(hours=24))
        .annotate(hour=F('creation_date__hour'))
        .values('creation_date__date', 'hour')
        .annotate(count=Count('id'))
    )

    for entry in raw_counts:
        hour_str = f"{entry['creation_date__date']} {entry['hour']:02}:00"
        hourly_counts[hour_str] = entry['count']

    logger.debug(f"Hourly Counts: {hourly_counts}")
    return JsonResponse({'hourly_counts': hourly_counts})

@login_required(login_url='/custom_user/login/')
def daily_records_data(request):
    # Calculate daily record counts for the past 7 days
    last_7_days = [now().date() - timedelta(days=i) for i in range(6, -1, -1)]
    daily_counts = {str(day): 0 for day in last_7_days}

    raw_counts = (
        Client.objects.filter(creation_date__date__gte=now() - timedelta(days=7))
        .values('creation_date__date')
        .annotate(count=Count('id'))
    )

    for entry in raw_counts:
        day_str = str(entry['creation_date__date'])
        daily_counts[day_str] = entry['count']

    logger.debug(f"Daily Counts: {daily_counts}")
    return JsonResponse({'daily_counts': daily_counts})

@login_required(login_url='/custom_user/login/')
def monthly_records_data(request):
    # Calculate monthly record counts for the past year
    last_12_months = [(now().date().replace(day=1) - relativedelta(months=i)) for i in range(11, -1, -1)]
    monthly_counts = {month.strftime('%Y-%m'): 0 for month in last_12_months}

    raw_counts = (
        Client.objects.annotate(month=TruncMonth('creation_date'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    for entry in raw_counts:
        month_str = str(entry['month'])
        monthly_counts[month_str] = entry['count']

    logger.debug(f"Monthly Counts: {monthly_counts}")
    return JsonResponse({'monthly_counts': monthly_counts})

from .models import ClientField, FieldTemplate

def save_client_fields(client, cleaned_data):
    """
    Helper function to save or update client fields based on the provided cleaned data.
    """
    for field in FieldTemplate.objects.all():
        value = cleaned_data.get(f'field_{field.id}', '')
        client_field, _ = ClientField.objects.get_or_create(client=client, template=field)
        client_field.value = value
        client_field.save()

@login_required(login_url='/custom_user/login/')
def customer_detail(request, customer_id):
    # Ensure customer exists and belongs to the user
    customer = get_object_or_404(Client, id=customer_id, created_by=request.user)

    # Get templates once and as a list to preserve order
    field_templates = list(FieldTemplate.objects.all())

    # Prefetch fields for the single client to avoid N+1
    clients_qs = Client.objects.filter(id=customer_id).prefetch_related('fields__template')

    # Build rows: each row contains client and ordered values matching field_templates
    rows = []
    for client in clients_qs:
        # map template id -> value
        mapping = {cf.template_id: cf.value for cf in client.fields.all()}
        values = [mapping.get(ft.id, '-') for ft in field_templates]
        rows.append({'client': client, 'values': values})

    return render(request, 'LeadTracker/customer_detail.html', {
        'rows': rows,
        'field_templates': field_templates,
    })
