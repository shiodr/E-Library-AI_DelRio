from datetime import date, datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def https_listing_url(value: str | None) -> str | None:
    if value is None:
        return None
    try:
        parsed = urlsplit(value)
        valid = (
            parsed.scheme == "https" and parsed.hostname
            and parsed.username is None and parsed.password is None
            and "\\" not in value
            and not any(character.isspace() or ord(character) < 32 for character in value)
        )
        _ = parsed.port
    except ValueError:
        valid = False
    if not valid:
        raise ValueError("Use an HTTPS URL without embedded credentials.")
    return value


class PriceInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    source_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=4)
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    offer_format: str = Field(min_length=1, max_length=80)
    source_url: str = Field(max_length=500)
    checked_on: date
    rate_php_per_unit: Decimal | None = Field(default=None, gt=0, max_digits=16, decimal_places=8)
    rate_date: date | None = None

    _verify_url = field_validator("source_url")(https_listing_url)

    @property
    def centavos(self) -> int:
        rate = self.rate_php_per_unit or Decimal(1)
        return int((self.source_amount * rate * 100).quantize(Decimal(1), rounding=ROUND_HALF_UP))

    @model_validator(mode="after")
    def verify_offer(self):
        if self.checked_on > datetime.now(timezone(timedelta(hours=8))).date():
            raise ValueError("The price check date cannot be in the future.")
        if self.currency == "PHP":
            if self.rate_php_per_unit is not None or self.rate_date is not None:
                raise ValueError("A peso offer does not use an exchange rate.")
        elif self.rate_php_per_unit is None or self.rate_date is None or self.rate_date > self.checked_on:
            raise ValueError("A foreign offer needs a dated BSP exchange rate on or before the price check.")
        if not 0 < self.centavos <= 9_007_199_254_740_991:
            raise ValueError("The converted price is outside the supported range.")
        return self

    def record(self) -> dict:
        return {**self.model_dump(), "amount_php_minor": self.centavos}


class PriceOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source_amount: Decimal
    currency: str
    offer_format: str
    source_url: str
    checked_on: date
    rate_php_per_unit: Decimal | None
    rate_date: date | None
    amount_php_minor: int
