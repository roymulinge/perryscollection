from allauth.account.forms import SignupForm
from django import forms

class CustomSignupForm(SignupForm):
    phone_number = forms.CharField(
        max_legth = 15,
        required = True,
        label = "Phone number"
    )

    def save(self, request):
        user = super().save(request)
        user.phone_number = self.cleaned_data['phone_number']
        user.phone_number_provided = True
        user.save()
        return user