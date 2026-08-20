plugins {
    id("com.android.application")
}

android {
    namespace = "com.marketwatch.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.marketwatch.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}
