package com.alasonora.backend.ai;

import java.util.Arrays;

import org.springframework.stereotype.Component;

import com.alasonora.backend.config.AudioUploadProperties;

/**
 * Revisa el audio antes de mandarlo al motor: tamaño máximo y formato real por su firma (WAV, FLAC
 * o MP3), no por el nombre ni el tipo que declaró el navegador.
 */
@Component
public class AudioFileValidator {

    private static final byte[] RIFF = {'R', 'I', 'F', 'F'};
    private static final byte[] WAVE = {'W', 'A', 'V', 'E'};
    private static final byte[] FLAC = {'f', 'L', 'a', 'C'};
    private static final byte[] ID3 = {'I', 'D', '3'};
    private static final int MPEG_SYNC_MASK = 0xE0;

    private final AudioUploadProperties properties;

    public AudioFileValidator(AudioUploadProperties properties) {
        this.properties = properties;
    }

    public void requireSupported(byte[] audio) {
        if (audio.length > properties.maxBytes()) {
            throw new AudioFileRejectedException(AudioFileRejectedException.Reason.TOO_LARGE);
        }
        if (!isWav(audio) && !startsWith(audio, FLAC) && !isMp3(audio)) {
            throw new AudioFileRejectedException(AudioFileRejectedException.Reason.UNSUPPORTED_FORMAT);
        }
    }

    private static boolean isWav(byte[] audio) {
        return startsWith(audio, RIFF) && audio.length >= 12 && Arrays.equals(Arrays.copyOfRange(audio, 8, 12), WAVE);
    }

    // MP3: etiqueta ID3 al inicio o directamente un frame MPEG (11 bits de sincronía en 1).
    private static boolean isMp3(byte[] audio) {
        return startsWith(audio, ID3) || (audio.length >= 2 && (audio[0] & 0xFF) == 0xFF && (audio[1] & MPEG_SYNC_MASK) == MPEG_SYNC_MASK);
    }

    private static boolean startsWith(byte[] audio, byte[] signature) {
        return audio.length >= signature.length && Arrays.equals(Arrays.copyOf(audio, signature.length), signature);
    }
}
