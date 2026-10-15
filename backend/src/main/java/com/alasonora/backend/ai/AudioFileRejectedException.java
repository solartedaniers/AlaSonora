package com.alasonora.backend.ai;

/** El audio no se manda al motor: pesa más de lo permitido o no es un formato compatible. */
public class AudioFileRejectedException extends RuntimeException {

    public enum Reason { TOO_LARGE, UNSUPPORTED_FORMAT }

    private final Reason reason;

    public AudioFileRejectedException(Reason reason) {
        super(reason.name());
        this.reason = reason;
    }

    public Reason reason() {
        return reason;
    }
}
