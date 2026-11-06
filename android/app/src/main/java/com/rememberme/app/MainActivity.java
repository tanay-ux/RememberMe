package com.rememberme.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Receives Android share-sheet text (LinkedIn profile URLs) and rewrites them
 * into rememberme:// deep links so Capacitor App.appUrlOpen / getLaunchUrl fire.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "RememberMeShare";

    private static final Pattern LINKEDIN_IN =
        Pattern.compile(
            "(?:https?://)?(?:www\\.)?linkedin\\.com/(?:in|pub|mwlite/in)/[A-Za-z0-9._%~-]+/?",
            Pattern.CASE_INSENSITIVE
        );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Intent rewritten = asDeepLinkIntent(getIntent());
        if (rewritten != null) {
            setIntent(rewritten);
            Log.i(TAG, "onCreate share → " + rewritten.getData());
        }
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        Intent rewritten = asDeepLinkIntent(intent);
        Intent toDeliver = rewritten != null ? rewritten : intent;
        if (rewritten != null) {
            Log.i(TAG, "onNewIntent share → " + rewritten.getData());
        }
        setIntent(toDeliver);
        super.onNewIntent(toDeliver);
    }

    /**
     * If this is an ACTION_SEND share, return a fresh ACTION_VIEW deep link intent.
     * Otherwise return null (leave the original intent alone).
     */
    private Intent asDeepLinkIntent(Intent source) {
        if (source == null) return null;
        if (!Intent.ACTION_SEND.equals(source.getAction())) return null;

        String text = source.getStringExtra(Intent.EXTRA_TEXT);
        if (text == null || text.trim().isEmpty()) {
            CharSequence seq = source.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (seq != null) text = seq.toString();
        }
        if (text == null || text.trim().isEmpty()) {
            // Some sharers put the URL in EXTRA_STREAM as a content URI — skip;
            // LinkedIn/Chrome use EXTRA_TEXT for profile links.
            Log.w(TAG, "ACTION_SEND with empty EXTRA_TEXT");
            return null;
        }

        String deepLink = buildDeepLink(text.trim());
        if (deepLink == null) return null;

        Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLink));
        view.setPackage(getPackageName());
        view.setComponent(source.getComponent());
        // Preserve task affinity behavior for singleTask
        view.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return view;
    }

    private static String buildDeepLink(String text) {
        // Keep the full share body in `text` so JS can pull name/headline lines.
        // Also pass a clean linkedin= URL when we can extract one.
        String truncated = text.length() > 2000 ? text.substring(0, 2000) : text;
        String linkedIn = extractLinkedIn(text);
        if (linkedIn != null) {
            return "rememberme://add?linkedin="
                + Uri.encode(normalizeLinkedIn(linkedIn))
                + "&text="
                + Uri.encode(truncated);
        }
        return "rememberme://add?text=" + Uri.encode(truncated);
    }

    private static String extractLinkedIn(String text) {
        Matcher m = LINKEDIN_IN.matcher(text);
        if (!m.find()) return null;
        return m.group();
    }

    private static String normalizeLinkedIn(String raw) {
        String withScheme = raw.matches("(?i)^https?://.*") ? raw : "https://" + raw;
        return withScheme
            .replaceAll("(?i)/(?:pub|mwlite/in)/", "/in/")
            .replaceAll("/+$", "");
    }
}
