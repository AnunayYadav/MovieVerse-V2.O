package com.movieverse.app;

import android.app.UiModeManager;
import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            String defaultUserAgent = settings.getUserAgentString();
            
            UiModeManager uiModeManager = (UiModeManager) getSystemService(UI_MODE_SERVICE);
            if (uiModeManager != null && uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION) {
                settings.setUserAgentString(defaultUserAgent + " MovieVerseTV");
            } else {
                settings.setUserAgentString(defaultUserAgent + " MovieVerseMobile");
            }
        }
    }
}
