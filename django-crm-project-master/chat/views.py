from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import ChatRoom, ChatMessage
from django.core.cache import cache
import json

User = get_user_model()

@login_required
def chat_view(request):
    """Ana chat sayfası"""
    # Kullanıcının online durumunu güncelle
    cache_key = f"user_online_{request.user.id}"
    cache.set(cache_key, True, 300)  # 5 dakika boyunca online olarak işaretle

    users = User.objects.exclude(id=request.user.id).select_related('profile')
    context = {
        'users': users,
        'csrf_token': request.META.get('CSRF_COOKIE', '')
    }
    return render(request, 'chat/chat.html', context)

@require_POST
@csrf_exempt
@login_required
def create_private_room(request):
    """İki kullanıcı arasında özel oda oluştur"""
    try:
        # Kullanıcının online durumunu güncelle
        cache_key = f"user_online_{request.user.id}"
        cache.set(cache_key, True, 300)  # 5 dakika boyunca online olarak işaretle

        data = json.loads(request.body)
        other_user_id = data.get('user_id')

        if not other_user_id:
            return JsonResponse({'success': False, 'error': 'Kullanıcı ID gerekli'})

        other_user = get_object_or_404(User, id=other_user_id)

        # Özel oda adı oluştur
        room_name = f"private_{min(request.user.id, other_user.id)}_{max(request.user.id, other_user.id)}"

        with transaction.atomic():
            # Oda varsa al, yoksa oluştur
            room, created = ChatRoom.objects.get_or_create(
                name=room_name,
                defaults={
                    'created_by': request.user,
                    'is_private': True
                }
            )

            # Kullanıcıları odaya ekle
            if request.user not in room.members.all():
                room.members.add(request.user)
            if other_user not in room.members.all():
                room.members.add(other_user)

        return JsonResponse({
            'success': True,
            'room_id': room.id,
            'room_name': room.name
        })

    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Kullanıcı bulunamadı'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_POST
@csrf_exempt
@login_required
def send_message(request):
    """Mesaj gönder"""
    try:
        # Kullanıcının online durumunu güncelle
        cache_key = f"user_online_{request.user.id}"
        cache.set(cache_key, True, 300)  # 5 dakika boyunca online olarak işaretle

        data = json.loads(request.body)
        room_id = data.get('room_id')
        content = data.get('content', '').strip()

        if not room_id or not content:
            return JsonResponse({'success': False, 'error': 'Oda ID ve mesaj içeriği gerekli'})

        room = get_object_or_404(ChatRoom, id=room_id, members=request.user)

        message = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            content=content
            # is_read=False (default değer)
        )

        return JsonResponse({
            'success': True,
            'message_id': message.id,
            'timestamp': message.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        })

    except ChatRoom.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Oda bulunamadı'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_GET
@login_required
def get_messages(request):
    """Odadaki mesajları al"""
    try:
        # Kullanıcının online durumunu güncelle
        cache_key = f"user_online_{request.user.id}"
        cache.set(cache_key, True, 300)  # 5 dakika boyunca online olarak işaretle

        room_id = request.GET.get('room_id')
        last_id = request.GET.get('last_id', 0)

        if not room_id:
            return JsonResponse({'success': False, 'error': 'Oda ID gerekli'})

        room = get_object_or_404(ChatRoom, id=room_id, members=request.user)

        # Son mesajları al
        messages = ChatMessage.objects.filter(
            room=room,
            id__gt=last_id
        ).select_related('sender', 'sender__profile')[:50]

        message_data = [
            {
                'id': msg.id,
                'sender_id': msg.sender.id,
                'sender_name': msg.sender.get_full_name() or msg.sender.username,
                'sender_name': msg.sender.get_full_name() or msg.sender.username,
                'sender_avatar': (
                    msg.sender.profile.profile_picture.url
                    if hasattr(msg.sender, 'profile') and msg.sender.profile.profile_picture
                    else '/media/profile_pictures/default_avatar_JxNUiAn.png'
                ),
                'content': msg.content,
                'timestamp': msg.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                'is_sender': msg.sender == request.user,
                'is_read': msg.is_read
            }
            for msg in messages
        ]

        return JsonResponse({
            'success': True,
            'messages': message_data
        })

    except ChatRoom.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Oda bulunamadı'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_GET
@login_required
def get_users(request):
    """Kullanıcı listesini al"""
    try:
        users = User.objects.exclude(id=request.user.id).select_related('profile')

        # Mevcut kullanıcının online durumunu güncelle
        cache_key = f"user_online_{request.user.id}"
        cache.set(cache_key, True, 300)  # 5 dakika boyunca online olarak işaretle

        user_data = []
        for user in users:
            # Özel oda adını oluştur
            room_name = f"private_{min(request.user.id, user.id)}_{max(request.user.id, user.id)}"

            # Okunmamış mesaj sayısını hesapla
            unread_count = ChatMessage.objects.filter(
                room__name=room_name,
                room__members=request.user,
                sender=user,
                is_read=False
            ).count()

            # Kullanıcının online durumunu kontrol et
            user_cache_key = f"user_online_{user.id}"
            is_online = cache.get(user_cache_key, False)

            user_data.append({
                'id': user.id,
                'username': user.username,
                'full_name': user.get_full_name() or user.username,
                'avatar': (
                    user.profile.profile_picture.url
                    if hasattr(user, 'profile') and user.profile.profile_picture
                    else '/media/profile_pictures/default_avatar_JxNUiAn.png'
                ),
                'is_online': is_online,
                'unread_count': unread_count
            })

        return JsonResponse({
            'success': True,
            'users': user_data
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_POST
@csrf_exempt
@login_required
def mark_message_read(request):
    """Mesajları okundu olarak işaretle"""
    try:
        # Kullanıcının online durumunu güncelle
        cache_key = f"user_online_{request.user.id}"
        cache.set(cache_key, True, 300)  # 5 dakika boyunca online olarak işaretle

        data = json.loads(request.body)
        message_ids = data.get('message_ids', [])
        room_id = data.get('room_id')

        if not message_ids or not room_id:
            return JsonResponse({'success': False, 'error': 'Mesaj ID\'leri ve oda ID gerekli'})

        # Kullanıcının erişimi olan mesajları bul
        messages = ChatMessage.objects.filter(
            id__in=message_ids,
            room_id=room_id,
            room__members=request.user
        ).exclude(sender=request.user)  # Sadece başkalarının mesajları

        # Mesajları okundu olarak işaretle
        updated_count = messages.update(is_read=True)

        return JsonResponse({
            'success': True,
            'updated_count': updated_count
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@require_POST
@csrf_exempt
@login_required
def mark_room_messages_read(request):
    """Odadaki tüm mesajları okundu olarak işaretle"""
    try:
        # Kullanıcının online durumunu güncelle
        cache_key = f"user_online_{request.user.id}"
        cache.set(cache_key, True, 300)  # 5 dakika boyunca online olarak işaretle

        data = json.loads(request.body)
        room_id = data.get('room_id')

        if not room_id:
            return JsonResponse({'success': False, 'error': 'Oda ID gerekli'})

        # Kullanıcının erişimi olan odadaki mesajları bul
        messages = ChatMessage.objects.filter(
            room_id=room_id,
            room__members=request.user,
            is_read=False  # Sadece okunmamış olanları
        ).exclude(sender=request.user)  # Sadece başkalarının mesajları

        # Mesajları okundu olarak işaretle
        updated_count = messages.update(is_read=True)

        return JsonResponse({
            'success': True,
            'updated_count': updated_count
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@login_required
def typing_status(request):
    """Yazma durumunu ayarla veya kontrol et"""
    try:
        # Kullanıcının online durumunu güncelle
        cache_key = f"user_online_{request.user.id}"
        cache.set(cache_key, True, 300)  # 5 dakika boyunca online olarak işaretle

        if request.method == 'POST':
            # Yazma durumunu ayarla
            data = json.loads(request.body)
            room_id = data.get('room_id')
            is_typing = data.get('is_typing', False)

            if not room_id:
                return JsonResponse({'success': False, 'error': 'Oda ID gerekli'})

            room = get_object_or_404(ChatRoom, id=room_id, members=request.user)

            # Cache key oluştur
            cache_key = f"typing_{room_id}_{request.user.id}"

            if is_typing:
                # Yazma durumunu 10 saniye cache'e kaydet
                cache.set(cache_key, True, 10)
            else:
                # Yazma durumunu temizle
                cache.delete(cache_key)

            return JsonResponse({'success': True})

        elif request.method == 'GET':
            # Yazma durumunu kontrol et
            room_id = request.GET.get('room_id')

            if not room_id:
                return JsonResponse({'success': False, 'error': 'Oda ID gerekli'})

            room = get_object_or_404(ChatRoom, id=room_id, members=request.user)

            # Odadaki diğer üyelerin yazma durumunu kontrol et
            is_typing = False
            for member in room.members.all():
                if member != request.user:
                    cache_key = f"typing_{room_id}_{member.id}"
                    if cache.get(cache_key):
                        is_typing = True
                        break

            return JsonResponse({
                'success': True,
                'is_typing': is_typing
            })

        else:
            return JsonResponse({'success': False, 'error': 'Geçersiz method'})

    except ChatRoom.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Oda bulunamadı'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@login_required
def user_presence(request):
    """Kullanıcının online/offline durumunu günceller"""
    try:
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Sadece POST methodu desteklenir'})

        data = json.loads(request.body)
        is_online = data.get('online', False)

        cache_key = f"user_online_{request.user.id}"

        if is_online:
            # Kullanıcıyı online yap (5 dakika)
            cache.set(cache_key, True, 300)
        else:
            # Kullanıcıyı offline yap
            cache.delete(cache_key)

        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
