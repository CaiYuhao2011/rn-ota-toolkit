package com.ota.vo;

import cn.hutool.json.JSONObject;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class MetaData {
    private JSONObject metadataJson;
    private String createdAt;
    private String id;
}
