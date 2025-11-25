package com.ota.exception;

public class NoUpdateAvailableException extends RuntimeException {
    public NoUpdateAvailableException() {
        super("No update available.");
    }
}
