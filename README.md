
# DjangoEliteCRM

Modern, full-featured Customer Relationship Management (CRM) system built with **Django 5.2.5**.

---

## Features

- **User management and authentication** (Custom User Model)
- **Real-time chat** and live notification system (AJAX polling, WhatsApp-style UI)
- **Unread message badge** in the sidebar
- **Lead and customer management**, dashboard and analytics screens
- **Responsive and mobile-friendly interface** (Flexbox, modern CSS)
- **Advanced form management** (django-crispy-forms, bootstrap4/5)
- **Data import/export with Excel** (openpyxl)
- **Admin panel** and custom admin tools

---

## Installation

1. **Clone the repository:**
	```sh
	git clone https://github.com/zayfayk/New-Crm.git
	cd New-Crm
	```
2. **Create and activate a virtual environment:**
	```sh
	python -m venv venv
	# Windows:
	venv\Scripts\activate
	# Mac/Linux:
	source venv/bin/activate
	```
3. **Install requirements:**
	```sh
	pip install -r requirements.txt
	```
4. **Run migrations:**
	```sh
	python manage.py migrate
	```
5. **Create a superuser:**
	```sh
	python manage.py createsuperuser
	```
6. **Start the development server:**
	```sh
	python manage.py runserver
	```

---

## requirements.txt

```
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
```

---

## License

GNU GPL v3

---

## DjangoEliteCRM (Türkçe)

Django 5.2.5 ile geliştirilmiş modern ve tam özellikli Müşteri İlişkileri Yönetimi (CRM) sistemi.

### Özellikler

- Kullanıcı yönetimi ve kimlik doğrulama (Custom User Model)
- Gerçek zamanlı chat ve canlı bildirim sistemi (AJAX polling, WhatsApp tarzı UI)
- Sidebar'da okunmamış mesaj sayısı rozeti
- Lead ve müşteri yönetimi, dashboard ve analiz ekranları
- Responsive ve mobil uyumlu arayüz (Flexbox, modern CSS)
- Gelişmiş form yönetimi (django-crispy-forms, bootstrap4/5)
- Excel (openpyxl) ile veri aktarımı
- Admin paneli ve özel yönetici araçları

### Kurulum

1. Depoyu klonlayın:
	```sh
	git clone https://github.com/zayfayk/New-Crm.git
	cd New-Crm
	```
2. Sanal ortam oluşturun ve aktif edin:
	```sh
	python -m venv venv
	# Windows:
	venv\Scripts\activate
	# Mac/Linux:
	source venv/bin/activate
	```
3. Gereksinimleri yükleyin:
	```sh
	pip install -r requirements.txt
	```
4. Veritabanını başlatın:
	```sh
	python manage.py migrate
	```
5. Yönetici hesabı oluşturun:
	```sh
	python manage.py createsuperuser
	```
6. Sunucuyu başlatın:
	```sh
	python manage.py runserver
	```

---

### Lisans

GNU GPL v3