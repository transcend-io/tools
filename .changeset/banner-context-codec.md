---
'@transcend-io/airgap.js-types': minor
---

Add the `BannerContext` and `BannerContextOverridesDropped` codecs, plus `bannerContextWebFixture` and `bannerContextMobileFixture`, so consent clients and the record of consent write path share one banner context shape. Add `StoredBannerContext` for reading stored records of consent, where `overrides` may be the dropped marker.
