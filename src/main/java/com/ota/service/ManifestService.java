package com.ota.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Expo Update Manifest V1 Protocol Definitions
 *
 * @author caiyuhao
 */
public interface ManifestService {
    void endpoint(HttpServletRequest request, HttpServletResponse response);
}
