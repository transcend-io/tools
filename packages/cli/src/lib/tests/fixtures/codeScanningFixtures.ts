import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Materialize dependency manifests at runtime so they do not live in the repo as
// real fixtures that Dependabot and editor search treat like actual projects.
const SWIFT_PACKAGE_RESOLVED_V2 = `{
  "pins": [
    {
      "identity": "alamofire",
      "kind": "remoteSourceControl",
      "location": "https://github.com/Alamofire/Alamofire.git",
      "state": {
        "revision": "3dc6a42c7727c49bf26508e29b0a0b35f9c7e1ad",
        "version": "5.8.1"
      }
    },
    {
      "identity": "swift-numerics",
      "kind": "remoteSourceControl",
      "location": "https://github.com/apple/swift-numerics.git",
      "state": {
        "revision": "0a5bc04095a675662cf24757cc0640aa2204253b",
        "version": "1.0.2"
      }
    }
  ],
  "version": 2
}
`;

const SWIFT_PACKAGE_RESOLVED_V1 = `{
  "object": {
    "pins": [
      {
        "package": "Apollo",
        "repositoryURL": "https://github.com/apollographql/apollo-ios.git",
        "state": {
          "branch": null,
          "revision": "23904fc264bf01539dd031a2f8d6692e1bd14ff0",
          "version": "1.25.2"
        }
      },
      {
        "package": "CwlCatchException",
        "repositoryURL": "https://github.com/mattgallagher/CwlCatchException.git",
        "state": {
          "branch": null,
          "revision": "35f9e770f54ce62dd8526470f14c6e137cef3eea"
        }
      }
    ]
  },
  "version": 1
}
`;

const codeScanningFixtureFiles = [
  [
    'test-cocoa-pods/Podfile',
    `target 'YourAppTargetName' do
  pod 'Braze-iOS-SDK'
  pod 'Branch'
  pod 'Firebase/Analytics'
  pod 'Mixpanel'
  pod 'Amplitude-iOS', '~> 8.0'
  pod 'Google-Mobile-Ads-SDK'
  pod 'FacebookAdsSDK'
  pod 'MoPub-SDK'
  pod 'Alamofire', '~> 5.2'
  pod 'SDWebImage'
  pod 'AppsFlyerFramework'
  pod 'Adjust'
  pod 'Flurry-iOS-SDK/FlurrySDK'
end
`,
  ],
  [
    'test-gradle/build.gradle',
    `apply plugin: 'com.android.application'

android {
  defaultConfig {
    applicationId "com.yourcompany.yourapp"
  }
}

dependencies {
  implementation 'androidx.appcompat:appcompat:1.2.0'
  implementation 'androidx.constraintlayout:constraintlayout:2.0.4'
  implementation 'com.appboy:android-sdk-ui:14.0.0'
  implementation 'io.branch.sdk.android:library:5.0.1'
  implementation 'com.google.firebase:firebase-analytics:18.0.0'
  implementation 'com.google.android.gms:play-services-ads:19.7.0'
  implementation 'com.facebook.android:audience-network-sdk:6.2.0'
  implementation 'com.mixpanel.android:mixpanel-android:5.8.7'
  implementation 'com.amplitude:android-sdk:2.30.0'
  implementation 'com.squareup.retrofit2:retrofit:2.9.0'
  implementation 'com.squareup.okhttp3:okhttp:4.9.0'
  implementation 'com.squareup.picasso:picasso:2.71828'
  implementation group: 'org.eclipse.jdt', name: 'org.eclipse.jdt.core', version: '3.28.0'
}

apply plugin: 'com.google.gms.google-services'
`,
  ],
  [
    'test-gradle/test-nested-package-json/package.json',
    `{
  "name": "@test-example/nested-test",
  "version": "4.120.1",
  "private": true,
  "description": "Example npm nested package.",
  "dependencies": {
    "dd-trace": "2.45.1",
    "fast-csv": "^4.3.6"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
`,
  ],
  [
    'test-gradle/test-nested-gemfile/Gemfile',
    `source 'https://rubygems.org'

gem 'rails', '~> 6.1.4'
gem 'ahoy_matey'
gem 'rack-tracker'
gem 'adroll'
gem 'google-ads-googleads'
gem 'facebookads', require: 'facebook_ads'
gem 'byebug'
gem 'listen', '~> 3.3'
gem 'capybara', '>= 2.15'
gem 'selenium-webdriver'
gem 'webdrivers'
gem 'bundler-audit'
`,
  ],
  [
    'test-package-json/package.json',
    `{
  "name": "@test-example/test",
  "version": "4.120.1",
  "private": true,
  "description": "Example npm package.",
  "dependencies": {
    "dd-trace": "2.45.1",
    "fast-csv": "^4.3.6",
    "sequelize": "^6.37.3",
    "sequelize-mock": "^0.10.2"
  },
  "devDependencies": {
    "@types/sequelize": "^4.28.20",
    "typescript": "catalog:"
  }
}
`,
  ],
  [
    'test-package-json/test-nested-requirements-txt/requirements.txt',
    `pyarrow==14.0.1
pandas==2.0.3
`,
  ],
  [
    'test-requirements-txt/setup.py',
    `from setuptools import setup

setup(
    name='test_requirements_txt',
    description='A sample Python package',
)
`,
  ],
  [
    'test-requirements-txt/requirements.txt',
    `pyarrow==14.0.1
cryptography==41.0.6
Flask==3.1.3
cachetools==5.3.0
`,
  ],
  [
    'test-requirements-txt/nested-cocoapods/Podfile',
    `target 'ExampleBootstrap' do
  pod 'ExampleLib', :path => '../'
  pod 'AppsFlyerFramework'
  pod 'Adjust'
  pod 'Flurry-iOS-SDK/FlurrySDK'
end

target 'ExampleBootstrapTests' do
  pod 'ExampleLib', :path => '../'
  pod 'Braze-iOS-SDK'
  pod 'Branch'
  pod 'Firebase/Analytics'
  pod 'Mixpanel'
  pod 'Amplitude-iOS', '~> 8.0'
end
`,
  ],
  [
    'test-requirements-txt/nested-cocoapods-2/Podfile',
    `target 'Acme' do
  pod 'RZVinyl'
  pod 'RZTransitions'
  pod 'SDWebImage'
  pod 'SwiftLint'

  target 'AcmeTests' do
    pod 'RZVinyl'
    pod 'iOSSnapshotTestCase'
    pod 'SnapshotTesting', '~> 1.8.1'
  end

  target 'NotificationServiceExtension' do
  end
end
`,
  ],
  [
    'test-gemfile/Gemfile',
    `source 'https://rubygems.org'

gem 'rails', '~> 6.1.4'
gem 'ahoy_matey'
gem 'rack-tracker'
gem 'adroll'
gem 'google-ads-googleads'
gem 'facebookads', require: 'facebook_ads'
gem 'devise'
gem 'impressionist'
gem 'sidekiq'
gem 'sidekiq-cron', '~> 1.2'
gem 'byebug'
gem 'listen', '~> 3.3'
gem 'capybara', '>= 2.15'
gem 'selenium-webdriver'
gem 'webdrivers'
gem 'bundler-audit'
`,
  ],
  [
    'test-kotlin/build.gradle.kts',
    `plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    id("kotlin-android")
    id("com.google.firebase.firebase-perf")
    id("kotlin-kapt")
    id("com.google.firebase.crashlytics")
    id("dagger.hilt.android.plugin")
    id("com.google.devtools.ksp")
    id("org.jetbrains.kotlin.plugin.compose")
}

apply(plugin = "newrelic")

dependencies {
    implementation("androidx.credentials:credentials:_")
    implementation("androidx.hilt:hilt-navigation-compose:_")
    implementation("androidx.hilt:hilt-work:_")
    implementation("androidx.localbroadcastmanager:localbroadcastmanager:_")
    implementation("androidx.media3:media3-exoplayer:_")
    implementation("androidx.media3:media3-exoplayer-dash:_")
    implementation("androidx.media3:media3-exoplayer-ima:_")
    implementation("androidx.media3:media3-ui:_")
    implementation("androidx.profileinstaller:profileinstaller:_")
    androidTestImplementation("androidx.test.espresso:espresso-contrib:_")
    androidTestImplementation("androidx.test.espresso:espresso-core:_")
    androidTestImplementation("androidx.test.espresso:espresso-intents:_")
    implementation("com.airbnb.android:lottie:_")
    implementation("com.android.installreferrer:installreferrer:_")
    implementation("com.appsflyer:af-android-sdk:_")
    implementation("com.braze:android-sdk-ui:_")
    implementation("com.facebook.android:facebook-android-sdk:_")
    implementation("com.facebook.android:facebook-applinks:_")
    implementation("com.facebook.android:facebook-login:_")
    implementation("com.facebook.android:facebook-share:_")
    implementation("com.foursquare:movementsdk:_")
    implementation("com.github.anrwatchdog:anrwatchdog:_")
    ksp("com.github.bumptech.glide:compiler:_")
    implementation("com.github.bumptech.glide:glide:_")
    ksp("com.github.bumptech.glide:ksp:_")
    implementation("com.github.bumptech.glide:okhttp3-integration:_")
    implementation("com.github.bumptech.glide:recyclerview-integration:_")
    implementation("com.github.chrisbanes:PhotoView:_")
    debugImplementation("com.github.chuckerteam.chucker:library:_")
    releaseImplementation("com.github.chuckerteam.chucker:library-no-op:_")
    implementation("com.github.jinatonic.confetti:confetti:_")
    implementation("com.github.MasayukiSuda:EasingInterpolator:_")
    implementation("com.github.newrelic.video-agent-android:NewRelicVideoCore:_")
    implementation("com.github.newrelic.video-agent-android:NRExoPlayerTracker:_")
    implementation("com.github.newrelic.video-agent-android:NRIMATracker:_")
    implementation("com.google.android.gms:play-services-auth-api-phone:_")
    implementation("com.google.android.gms:play-services-maps:_")
    implementation("com.google.android.material:material:_")
    implementation("com.google.android.play:app-update:_")
    implementation("com.google.android.play:asset-delivery:_")
    implementation("com.google.android.play:feature-delivery:_")
    implementation("com.google.android.play:review:_")
    implementation("com.google.api-client:google-api-client-android:_")
    implementation("com.google.apis:google-api-services-gmail:_")
    implementation("com.google.code.findbugs:jsr305:_")
    implementation("com.google.firebase:firebase-perf")
    implementation("com.google.guava:guava:_")
    implementation("com.google.http-client:google-http-client-gson:_")
    implementation("com.google.zxing:core:_")
    androidTestImplementation("com.googlecode.json-simple:json-simple:_")
    implementation(platform("com.microblink.blinkreceipt:blinkreceipt-bom:_"))
    implementation("com.microblink.blinkreceipt:blinkreceipt-account-linking")
    implementation("com.microblink.blinkreceipt:blinkreceipt-recognizer")
    implementation("com.newrelic.agent.android:android-agent:_")
    implementation("com.scandit.datacapture:barcode:_")
    implementation("com.scandit.datacapture:core:_")
    implementation("com.siftscience:sift-android:_")
    implementation("com.sun.mail:android-activation:_")
    implementation("com.sun.mail:android-mail:_")
    implementation("com.usebutton:android-sdk:_")
    implementation("com.wdullaer:materialdatetimepicker:_")
    testImplementation("io.mockk:mockk:_")
    implementation("jp.wasabeef:glide-transformations:_")
    api("net.toddm:androidcommframework:_")
    androidTestImplementation("org.apache.commons:commons-lang3:_")
    androidTestImplementation("org.apache.httpcomponents:httpclient:_")
    testImplementation("org.javassist:javassist:_")
    testImplementation("org.json:json:_")
    testImplementation("org.mockito:mockito-core:_")
    testImplementation("org.mockito.kotlin:mockito-kotlin:_")
}
`,
  ],
  [
    'test-pubspec/pubspec.yml',
    `name: example
description: test example app

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  firebase_core: 2.16.0
  firebase_analytics: 10.5.0
  firebase_crashlytics: 3.3.6
  video_player: 2.6.1
  appsflyer_sdk: 6.12.2
  isolate: 2.1.1
  custom_platform_device_id: 1.0.8
  image_editor: 1.3.0
  firebase_remote_config: 4.2.6
  intercom_flutter: 7.8.4
  dismissible_page: 1.0.2
  extended_text: 11.1.0
  recaptcha_enterprise_flutter: 18.3.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  test: 1.24.3
  lints: 3.0.0
  mocktail: 1.0.1
`,
  ],
  [
    'test-php/composer.json',
    `{
  "name": "composer/example",
  "description": "Example app",
  "require": {
    "php": "^7.2.5 || ^8.0",
    "composer/ca-bundle": "^1.5",
    "composer/class-map-generator": "^1.3.3",
    "composer/metadata-minifier": "^1.0",
    "composer/semver": "^3.3",
    "composer/spdx-licenses": "^1.5.7",
    "composer/xdebug-handler": "^2.0.2 || ^3.0.3",
    "justinrainbow/json-schema": "^5.3",
    "psr/log": "^1.0 || ^2.0 || ^3.0",
    "seld/jsonlint": "^1.4",
    "seld/phar-utils": "^1.2",
    "symfony/console": "^5.4.35 || ^6.3.12 || ^7.0.3",
    "symfony/filesystem": "^5.4.35 || ^6.3.12 || ^7.0.3",
    "symfony/finder": "^5.4.35 || ^6.3.12 || ^7.0.3",
    "symfony/process": "^5.4.35 || ^6.3.12 || ^7.0.3",
    "react/promise": "^3.2",
    "composer/pcre": "^2.2 || ^3.2",
    "symfony/polyfill-php73": "^1.24",
    "symfony/polyfill-php80": "^1.24",
    "symfony/polyfill-php81": "^1.24",
    "seld/signal-handler": "^2.0"
  },
  "require-dev": {
    "symfony/phpunit-bridge": "^6.4.3 || ^7.0.1",
    "phpstan/phpstan": "^1.11.8",
    "phpstan/phpstan-phpunit": "^1.4.0",
    "phpstan/phpstan-deprecation-rules": "^1.2.0",
    "phpstan/phpstan-strict-rules": "^1.6.0",
    "phpstan/phpstan-symfony": "^1.4.0"
  }
}
`,
  ],
  ['test-swift/Package.resolved', SWIFT_PACKAGE_RESOLVED_V2],
  ['test-swift/test-swift-v1/Package.resolved', SWIFT_PACKAGE_RESOLVED_V1],
  [
    'test-swift/transcend.xcworkspace/xcshareddata/swiftpm/Package.resolved',
    SWIFT_PACKAGE_RESOLVED_V2,
  ],
  [
    'test-swift/transcend.xcworkspace/transcend.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved',
    SWIFT_PACKAGE_RESOLVED_V2,
  ],
] as const;

/**
 * Materialize code scanning fixtures in a temporary directory for a test run.
 *
 * @param run - Callback that receives the temporary scan path.
 * @returns The callback result.
 */
export async function withCodeScanningFixtureTree<T>(
  run: (scanPath: string) => Promise<T>,
): Promise<T> {
  const scanPath = await mkdtemp(join(tmpdir(), 'code-scanning-fixtures-'));

  try {
    await Promise.all(
      codeScanningFixtureFiles.map(async ([relativePath, contents]) => {
        const targetPath = join(scanPath, relativePath);
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, contents, 'utf-8');
      }),
    );

    return await run(scanPath);
  } finally {
    await rm(scanPath, { recursive: true, force: true });
  }
}
