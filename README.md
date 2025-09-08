DjangoEliteCRM

Modern, full-featured Customer Relationship Management (CRM) system built with Django 5.2.5.

Features

User management and authentication (Custom User Model)

Real-time chat and live notification system (AJAX polling, WhatsApp-style UI)

Unread message badge in the sidebar

Lead and customer management, dashboard and analytics screens

Responsive and mobile-friendly interface (Flexbox, modern CSS)

Advanced form management (django-crispy-forms, bootstrap4/5)

Data import/export with Excel (openpyxl)

Admin panel and custom admin tools

Installation

Clone the repository:

git clone https://github.com/zayfayk/New-Crm.git
cd New-Crm


Create and activate a virtual environment:

python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate


Install requirements:

pip install -r requirements.txt


Run migrations:

python manage.py migrate


Create a superuser:

python manage.py createsuperuser


Start the development server:

python manage.py runserver

requirements.txt
asgiref==3.9.1
crispy-bootstrap4==2025.6
crispy-bootstrap5==2025.6
Django==5.2.5
django-crispy-forms==2.4
django-json-widget==2.0.3
et_xmlfile==2.0.0
gunicorn==23.0.0
openpyxl==3.1.5
packaging==25.0
pillow==11.3.0
python-dateutil==2.9.0.post0
six==1.17.0
sqlparse==0.5.3
tzdata==2025.2
waitress==3.0.2

License

GNU GPL v3

DjangoEliteCRM (Türkçe)

Django 5.2.5 ile geliştirilmiş modern ve tam özellikli Müşteri İlişkileri Yönetimi (CRM) sistemi.

Özellikler

Kullanıcı yönetimi ve kimlik doğrulama (Custom User Model)

Gerçek zamanlı chat ve canlı bildirim sistemi (AJAX polling, WhatsApp tarzı UI)

Sidebar'da okunmamış mesaj sayısı rozeti

Lead ve müşteri yönetimi, dashboard ve analiz ekranları

Responsive ve mobil uyumlu arayüz (Flexbox, modern CSS)

Gelişmiş form yönetimi (django-crispy-forms, bootstrap4/5)

Excel (openpyxl) ile veri aktarımı

Admin paneli ve özel yönetici araçları

Kurulum

Depoyu klonlayın:

git clone https://github.com/zayfayk/New-Crm.git
cd New-Crm


Sanal ortam oluşturun ve aktif edin:

python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate


Gereksinimleri yükleyin:

pip install -r requirements.txt


Veritabanını başlatın:

python manage.py migrate


Yönetici hesabı oluşturun:

python manage.py createsuperuser


Sunucuyu başlatın:

python manage.py runserver

Lisans

GNU GPL v3