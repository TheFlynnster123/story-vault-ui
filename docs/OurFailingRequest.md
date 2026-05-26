Request URL
http://localhost:7071/api/SubmitWorkflow
Request Method
POST

{"steps":[{"$type":"imageGen","input":{"engine":"sdcpp","ecosystem":"sdxl","operation":"createImage","model":"urn:air:anima:checkpoint:civitai:2458426@2945208","prompt":"masterpiece, best quality, score_9, score_8，highres, absurdres, official art， 1girl, sparkle \\(honkai: starrail\\), giantess, sitting, barefoot, she is much larger than skyscraper, city, destruction, building, skyscraper, bridge, highway, people, foreshortening, foot focus, cityscape, holding smell pink panties, tokyo tower between her thighs, seductive smile, cloud, contrail, airplane, dirty feet, steam around feet, many , cleavage, medium breasts, spread toes,, \nSnowy forest, night, moonlit, winter, cold, tattered clothes, injured, pale skin, determined expression, shoulder wound, kneeling in snow, whispering words, attempting shield, arm extended, bloody clothes, broken sword, worried expression, injured, lying in snow, clutching ribs, calling to Echo, weak, young face, torn clothes, noble features, determined eyes, emerging from behind log, encouraging Echo, gesturing, massive size, shadowy form, golden eyes, hooked teeth, feeding, biting Echo's shoulder, grinning, feeding on resonance, shadowy forms, hook-fingered, waiting, golden eyes, circling, watching, circling, waiting for attack, sensing weakness","negativePrompt":"score_1, score_2, score_3,bad anatomy, bad proportions, deformed anatomy, deformed face, deformed eyes, text, multiple fingers,watermark,artist name","sampleMethod":"euler_a","steps":40,"cfgScale":5,"width":1024,"height":1024,"loras":{"urn:air:anima:lora:civitai:199258@2964979":1}}}]}


{
    "id": "9005769-20260526010006655",
    "createdAt": "2026-05-26T01:00:06.6552795Z",
    "transactions": {
        "list": [
            {
                "type": "debit",
                "amount": 16,
                "id": "0267ebd8-31a2-4380-bbfb-1d04609ab9b8",
                "accountType": "blue"
            },
            {
                "type": "credit",
                "amount": 16,
                "id": "389d8195-a6db-4999-abd3-b62346c9f016",
                "accountType": "blue"
            }
        ]
    },
    "metadata": {},
    "status": "failed",
    "startedAt": "2026-05-26T01:00:07.552987Z",
    "completedAt": "2026-05-26T01:00:45.0625707Z",
    "tags": [],
    "arguments": {},
    "steps": [
        {
            "$type": "imageGen",
            "input": {
                "width": 1024,
                "height": 1024,
                "prompt": "masterpiece, best quality, score_9, score_8，highres, absurdres, official art， 1girl, sparkle \\(honkai: starrail\\), giantess, sitting, barefoot, she is much larger than skyscraper, city, destruction, building, skyscraper, bridge, highway, people, foreshortening, foot focus, cityscape, holding smell pink panties, tokyo tower between her thighs, seductive smile, cloud, contrail, airplane, dirty feet, steam around feet, many , cleavage, medium breasts, spread toes,, \nSnowy forest, night, moonlit, winter, cold, tattered clothes, injured, pale skin, determined expression, shoulder wound, kneeling in snow, whispering words, attempting shield, arm extended, bloody clothes, broken sword, worried expression, injured, lying in snow, clutching ribs, calling to Echo, weak, young face, torn clothes, noble features, determined eyes, emerging from behind log, encouraging Echo, gesturing, massive size, shadowy form, golden eyes, hooked teeth, feeding, biting Echo's shoulder, grinning, feeding on resonance, shadowy forms, hook-fingered, waiting, golden eyes, circling, watching, circling, waiting for attack, sensing weakness",
                "negativePrompt": "score_1, score_2, score_3,bad anatomy, bad proportions, deformed anatomy, deformed face, deformed eyes, text, multiple fingers,watermark,artist name",
                "sampleMethod": "euler_a",
                "schedule": "discrete",
                "steps": 40,
                "cfgScale": 5,
                "quantity": 1,
                "model": "urn:air:anima:checkpoint:civitai:2458426@2945208",
                "loras": {
                    "urn:air:anima:lora:civitai:199258@2964979": 1
                },
                "embeddings": [],
                "uCache": "off",
                "ecosystem": "sdxl",
                "engine": "sdcpp",
                "outputFormat": "jpeg"
            },
            "output": {
                "images": [
                    {
                        "width": 1024,
                        "height": 1024,
                        "previewUrl": "https://orchestration-new.civitai.com/v2/consumer/blobs/11c39c0a-b3b1-43d9-b758-e9188b2e3108-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZiar8-c2IQO83Z5_y0A2U4_G2-2bt7MWRPWIjkHWFdlIwWF9lTctA80of8KtO_11rZLgggQLm5DaTcHJwexnkv2yfS7KJbFxdb2YliUn5eF7_XEEAUQdHnWMtOM1YeVQsQK9XssP-S-sySq-JgiSuzIfmibN8Cy0or_XLMLQpJt2glWmnWe5BzniXE_X3iVwPsrWoqnPvLuIYWTkPqBNiqzkdPlHxWoYRrGB1LpVTkWah__0VZ7MmGO1C5VGpXU6H0wMKPI9bkFc2TfcaL4FVDzbz7PmdJu_1s6k2JS6KYuyVZXpM8QFrd00bTPawPt23SM&exp=2027-05-26T01:00:45.0704670Z",
                        "previewUrlExpiresAt": "2027-05-26T01:00:45.070467Z",
                        "id": "11c39c0a-b3b1-43d9-b758-e9188b2e3108-0.jpg",
                        "available": false,
                        "url": "https://orchestration-new.civitai.com/v2/consumer/blobs/11c39c0a-b3b1-43d9-b758-e9188b2e3108-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZiZ-f18DRl68Ti50FZc1mRQlA2obW9wNVI5MomCseAfJ_s_Ie0CSXhR7IoOSj6XktnAvUrvSHCsbSY4eyhwWX2PN4FPKpp1ReCS-ehyDLjvV1AXr8ro9LPvMSSJWHRlGk8SF7pKugQXagEZ0NMr80a_jdBkErt8co_t2xwrug72T-1_zmneC_ERs_v7O9A9PLiTZZw1CH4c8P5ERQPyRV3_DW6apVHhc6NIw9lKUDCEhHYr0ENwaTpu9JFMOQ3Nx9rvPfqr8estEguHgeVW9FFrLBfGk5Pt2Supmq6KMuaglcw&exp=2027-05-26T01:00:45.0704216Z",
                        "urlExpiresAt": "2027-05-26T01:00:45.0704216Z"
                    }
                ],
                "errors": []
            },
            "name": "$0",
            "priority": "low",
            "jobs": [
                {
                    "id": "11c39c0a-b3b1-43d9-b758-e9188b2e3108",
                    "status": "failed",
                    "startedAt": "2026-05-26T01:00:07.5529379Z",
                    "completedAt": "2026-05-26T01:00:45.0622931Z",
                    "cost": 16
                }
            ],
            "status": "failed",
            "startedAt": "2026-05-26T01:00:07.5529838Z",
            "completedAt": "2026-05-26T01:00:45.0623762Z",
            "metadata": {}
        }
    ],
    "callbacks": [],
    "tips": {
        "civitai": 0,
        "creators": 0
    },
    "cost": {
        "base": 0,
        "factors": {
            "base": 8,
            "pixels": 1,
            "steps": 2,
            "quantity": 1
        },
        "tips": {
            "civitai": 0,
            "creators": 0
        },
        "total": 0
    },
    "allowMatureContent": false,
    "upgradeMode": "automatic",
    "currencies": [],
    "forceRefunded": false
}