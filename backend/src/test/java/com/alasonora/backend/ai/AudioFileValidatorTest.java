package com.alasonora.backend.ai;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

import com.alasonora.backend.config.AudioUploadProperties;

/** Formato por firma y tamaño máximo, antes de gastar al motor de IA. */
class AudioFileValidatorTest {

    private final AudioFileValidator validator = new AudioFileValidator(new AudioUploadProperties(64));

    @Test
    void acceptsWavFlacAndMp3Signatures() {
        assertDoesNotThrow(() -> validator.requireSupported(bytes("RIFF\0\0\0\0WAVEfmt ")));
        assertDoesNotThrow(() -> validator.requireSupported(bytes("fLaC\0\0\0\"")));
        assertDoesNotThrow(() -> validator.requireSupported(bytes("ID3\u0004\0\0")));
        assertDoesNotThrow(() -> validator.requireSupported(new byte[] {(byte) 0xFF, (byte) 0xFB, 0x50, 0x00}));
    }

    @Test
    void rejectsOtherFormats() {
        AudioFileRejectedException ex = assertThrows(AudioFileRejectedException.class, () -> validator.requireSupported(bytes("%PDF-1.7 not audio")));
        assertEquals(AudioFileRejectedException.Reason.UNSUPPORTED_FORMAT, ex.reason());
    }

    @Test
    void rejectsFilesOverTheLimit() {
        byte[] big = new byte[65];
        System.arraycopy(bytes("RIFF\0\0\0\0WAVE"), 0, big, 0, 12);
        AudioFileRejectedException ex = assertThrows(AudioFileRejectedException.class, () -> validator.requireSupported(big));
        assertEquals(AudioFileRejectedException.Reason.TOO_LARGE, ex.reason());
    }

    private static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.ISO_8859_1);
    }
}
