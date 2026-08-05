from django.core.exceptions import ValidationError


def get_page_number(request):
    """
    Read and validate the page query parameter.

    Valid:
        ?page=1
        ?page=2
        ?page=10

    Invalid:
        ?page=0
        ?page=-1
        ?page=abc
        ?page=
    """

    page_param = request.query_params.get('page', '1')

    try:
        page = int(page_param)
    except (TypeError, ValueError):
        raise ValidationError("Page must be a positive integer.")

    if page < 1:
        raise ValidationError("Page must be a positive integer.")

    return page