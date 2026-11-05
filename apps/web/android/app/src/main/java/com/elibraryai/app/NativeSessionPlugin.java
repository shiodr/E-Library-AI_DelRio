package com.elibraryai.app;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** App-private session storage. Only ciphertext is written; encryption keys never leave Keystore. */
@CapacitorPlugin(name = "NativeSession")
public class NativeSessionPlugin extends Plugin {
    private static final String KEY_ALIAS = "com.elibraryai.session.v1";
    private static final String FILE_NAME = "session.v1.enc";
    private static final int IV_LENGTH = 12;
    private static final int MAX_RECORD_BYTES = 512;

    private AtomicFile vault() {
        return new AtomicFile(new File(getContext().getNoBackupFilesDir(), FILE_NAME));
    }

    private SecretKey key(boolean create) throws GeneralSecurityException, IOException {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        SecretKey existing = (SecretKey) store.getKey(KEY_ALIAS, null);
        if (existing != null || !create) return existing;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setKeySize(256)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }

    private String apiBaseUrl(PluginCall call) {
        String url = call.getString("apiBaseUrl");
        if (url == null || !url.startsWith("https://") || url.length() > 2048) {
            throw new IllegalArgumentException("A secure API address is required.");
        }
        return url;
    }

    private void erase() throws IOException {
        AtomicFile file = vault();
        file.delete();
        if (file.getBaseFile().exists()
            || new File(file.getBaseFile().getPath() + ".bak").exists()
            || new File(file.getBaseFile().getPath() + ".new").exists()) {
            throw new IOException("Session removal failed.");
        }
    }

    private void resolveToken(PluginCall call, String token) {
        JSObject result = new JSObject();
        result.put("token", token == null ? org.json.JSONObject.NULL : token);
        call.resolve(result);
    }

    @PluginMethod
    public synchronized void read(PluginCall call) {
        try {
            String url = apiBaseUrl(call);
            byte[] record = new byte[MAX_RECORD_BYTES + 1];
            int used = 0;
            try (FileInputStream input = vault().openRead()) {
                int count;
                while (used < record.length && (count = input.read(record, used, record.length - used)) > 0) {
                    used += count;
                }
            } catch (FileNotFoundException missing) {
                resolveToken(call, null);
                return;
            }
            if (used > MAX_RECORD_BYTES || used <= 1 + IV_LENGTH + 16 || record[0] != 1) {
                throw new GeneralSecurityException("Invalid saved session.");
            }
            SecretKey secret = key(false);
            if (secret == null) throw new GeneralSecurityException("Session key unavailable.");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secret, new GCMParameterSpec(128, record, 1, IV_LENGTH));
            // A saved credential is valid only for the API that issued it.
            cipher.updateAAD(url.getBytes(StandardCharsets.UTF_8));
            String token = new String(cipher.doFinal(record, 1 + IV_LENGTH, used - 1 - IV_LENGTH), StandardCharsets.UTF_8);
            if (token.isEmpty() || token.length() > 256) throw new GeneralSecurityException("Invalid saved session.");
            resolveToken(call, token);
        } catch (GeneralSecurityException | IllegalArgumentException invalid) {
            try {
                erase();
                resolveToken(call, null);
            } catch (IOException failed) {
                call.reject("Unable to clear the saved sign-in.");
            }
        } catch (IOException failed) {
            call.reject("Unable to read the saved sign-in.");
        }
    }

    @PluginMethod
    public synchronized void write(PluginCall call) {
        FileOutputStream output = null;
        AtomicFile file = vault();
        try {
            String url = apiBaseUrl(call);
            String token = call.getString("token");
            if (token == null || token.isEmpty() || token.length() > 256) {
                throw new IllegalArgumentException("A session credential is required.");
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(true));
            cipher.updateAAD(url.getBytes(StandardCharsets.UTF_8));
            byte[] encrypted = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
            byte[] iv = cipher.getIV();
            if (iv.length != IV_LENGTH) throw new GeneralSecurityException("Unexpected session format.");
            output = file.startWrite();
            output.write(1);
            output.write(iv);
            output.write(encrypted);
            file.finishWrite(output);
            output = null;
            Arrays.fill(encrypted, (byte) 0);
            call.resolve();
        } catch (GeneralSecurityException | IOException | IllegalArgumentException failed) {
            if (output != null) file.failWrite(output);
            try { erase(); } catch (IOException ignored) { /* Never fall back to unencrypted storage. */ }
            call.reject("Unable to securely save the sign-in.");
        }
    }

    @PluginMethod
    public synchronized void clear(PluginCall call) {
        try {
            erase();
            call.resolve();
        } catch (IOException failed) {
            call.reject("Unable to clear the saved sign-in.");
        }
    }
}
