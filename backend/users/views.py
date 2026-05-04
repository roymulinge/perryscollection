from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse

def home(request):
     return HttpResponse('Wecome to the home page!')

@login_required
def post_login_redirect(request):
    if not request.user.phone_number_provided:
          return redirect('require_phone')
    return redirect('home')

@login_required
def require_phone(request):
     if request.user.phone_number_provided:
          return redirect ('home')
     

     if request.method == 'POST':
          phone = request.POST.get('phone_number')

          if phone:
               request.user.phone_number = phone
               request.user.phone_number_provided = True
               request.user.save()
               return redirect('home')
          
          else:
               return redirect('home')
          
     return render(request, 'users/require_phone.html')
