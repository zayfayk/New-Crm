from django.contrib import admin
from .models import Client, FieldTemplate, ClientField, UserActivity
from .forms import DynamicClientForm
from django.utils.html import format_html
from django import forms

class FieldTemplateInline(admin.TabularInline):
    model = FieldTemplate
    extra = 1

class DynamicClientAdminForm(forms.ModelForm):
    class Meta:
        model = Client
        fields = ['created_by']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if instance := kwargs.get('instance'):
            for field in FieldTemplate.objects.all():
                client_field = instance.fields.filter(template=field).first()
                value = client_field.value if client_field else ''
                self.fields[f'field_{field.id}'] = forms.CharField(label=field.name, required=False, initial=value)
        else:
            for field in FieldTemplate.objects.all():
                self.fields[f'field_{field.id}'] = forms.CharField(label=field.name, required=False)

    def save(self, commit=True):
        instance = super().save(commit=False)
        if commit:
            instance.save()
            for field in FieldTemplate.objects.all():
                value = self.cleaned_data.get(f'field_{field.id}', '')
                client_field, created = ClientField.objects.get_or_create(client=instance, template=field)
                client_field.value = value
                client_field.save()
        return instance

class ClientAdmin(admin.ModelAdmin):
    form = DynamicClientAdminForm
    list_display = ('id', 'created_by', 'creation_date', 'formatted_dynamic_fields')
    list_filter = ('created_by',)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        for field in FieldTemplate.objects.all():
            ClientField.objects.get_or_create(client=obj, template=field)

    def formatted_dynamic_fields(self, obj):
        fields = obj.fields.all()
        if fields.exists():
            return format_html(
                '<ul style="list-style: none; padding: 0;">' +
                ''.join([f'<li><strong>{field.template.name}:</strong> {field.value}</li>' for field in fields]) +
                '</ul>'
            )
        return "No dynamic fields"
    formatted_dynamic_fields.short_description = 'Dynamic Fields'
admin.site.register(UserActivity)
admin.site.register(Client, ClientAdmin)
admin.site.register(FieldTemplate)