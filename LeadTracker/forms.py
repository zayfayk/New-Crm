from django import forms
from django.forms import ModelForm
from .models import FieldTemplate, Client, ClientField
import logging

logger = logging.getLogger(__name__)

class DynamicClientForm(ModelForm):
    class Meta:
        model = Client
        fields = []  # Exclude all fields; dynamic fields will be added in __init__

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        field_templates = FieldTemplate.objects.all()
        for field in field_templates:
            if self.instance.pk:  # If updating an existing instance
                client_field = self.instance.fields.filter(template=field).first()
                self.fields[f'field_{field.id}'] = forms.CharField(
                    label=field.name,
                    required=False,
                    initial=client_field.value if client_field else ''
                )
            else:  # For new instances
                self.fields[f'field_{field.id}'] = forms.CharField(
                    label=field.name,
                    required=False
                )

    def save(self, commit=True):
        instance = super().save(commit=False)
        if commit:
            instance.save()
        # Save dynamic fields
        for field_name, value in self.cleaned_data.items():
            if field_name.startswith('field_'):
                field_id = int(field_name.split('_')[1])
                template = FieldTemplate.objects.get(id=field_id)
                ClientField.objects.update_or_create(
                    client=instance,
                    template=template,
                    defaults={'value': value}
                )
        return instance

class ClientUpdateForm(ModelForm):
    class Meta:
        model = Client
        fields = []  # Removed 'name' field to avoid FieldError

class CustomerEditForm(ModelForm):
    class Meta:
        model = Client
        fields = []  # Remove user selection; other fields can be added dynamically