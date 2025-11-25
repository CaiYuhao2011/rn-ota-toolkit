package com.ota.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AssetMetadata {
    private String hash;
    private String key;
    private String fileExtension;
    private String contentType;
    private String url;
}
