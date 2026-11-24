package com.elibraryai.app;

import android.app.Activity;
import android.content.Intent;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "BookFiles")
public class BookFilesPlugin extends Plugin {
    private byte[] pendingPdf;

    @PluginMethod
    public synchronized void savePdf(PluginCall call) {
        if (pendingPdf != null) {
            call.reject("A book save is already open.");
            return;
        }
        String filename = call.getString("filename", "");
        String encoded = call.getString("base64", "");
        if (!filename.matches("[a-zA-Z0-9_-]{1,80}\\.pdf")
                || !encoded.startsWith("JVBERi0") || encoded.length() > 6_000_000) {
            call.reject("Invalid book file.");
            return;
        }
        try {
            pendingPdf = Base64.decode(encoded, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            call.reject("Invalid book file.");
            return;
        }
        // Capacitor serializes call options when the picker pauses the activity.
        call.getData().remove("base64");
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType("application/pdf")
                .putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(call, intent, "writePdf");
        } catch (RuntimeException error) {
            pendingPdf = null;
            call.reject("Unable to open the Android file picker.");
        }
    }

    @ActivityCallback
    private synchronized void writePdf(PluginCall call, ActivityResult result) {
        byte[] pdf = pendingPdf;
        pendingPdf = null;
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.resolve(new JSObject().put("saved", false));
            return;
        }
        if (pdf == null) {
            call.reject("The save was interrupted. Download the book again.");
            return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(data.getData())) {
            if (output == null) throw new IOException("Document destination unavailable.");
            output.write(pdf);
        } catch (IOException | SecurityException error) {
            call.reject("Unable to save the PDF.");
            return;
        }
        call.resolve(new JSObject().put("saved", true));
    }
}
