Request URL
https://civitai.red/api/trpc/orchestrator.generateFromGraph
Request Method
POST

{"json":{"input":{"workflow":"txt2img","priority":"low","outputFormat":"jpeg","ecosystem":"Anima","model":{"id":2945208,"baseModel":"Anima","model":{"type":"Checkpoint"},"strength":1},"resources":[{"id":2964979,"baseModel":"Anima","model":{"type":"LORA"},"strength":1,"trainedWords":["giantess"]}],"seed":null,"aspectRatio":{"value":"2:3","width":832,"height":1216},"cfgScale":5,"steps":40,"sampler":"er_sde","scheduler":"simple","prompt":"masterpiece, best quality, score_9, score_8，highres, absurdres, official artgiantess, sitting, barefoot, she is much larger than skyscraper, city, destruction, building, skyscraper, bridge, highway, people","negativePrompt":"score_1, score_2, score_3,bad anatomy, bad proportions, deformed anatomy, deformed face, deformed eyes, text, multiple fingers,watermark,artist name","quantity":1,"disablePoi":true},"remixOfId":null,"creatorTip":0.25,"civitaiTip":0,"tags":["source:new"],"buzzType":"yellow","authed":true},"meta":{"values":{"input.seed":["undefined"],"remixOfId":["undefined"]}}}

Response
{
    "result": {
        "data": {
            "json": {
                "id": "9005769-20260525232119460",
                "status": "scheduled",
                "createdAt": "2026-05-25T23:21:19.461Z",
                "transactions": [
                    {
                        "type": "debit",
                        "amount": 23,
                        "id": "93c68af4-2f89-429e-8a96-289556467803",
                        "accountType": "yellow"
                    }
                ],
                "cost": {
                    "base": 13,
                    "factors": {
                        "base": 8,
                        "pixels": 1,
                        "steps": 1.6,
                        "quantity": 1
                    },
                    "fixed": {
                        "licenseFees": 5,
                        "additionalResources": 1
                    },
                    "tips": {
                        "civitai": 0,
                        "creators": 4
                    },
                    "total": 23
                },
                "tags": [
                    "source:new",
                    "Anima",
                    "gen",
                    "txt2img",
                    "img",
                    "civitai"
                ],
                "allowMatureContent": true,
                "duration": null,
                "metadata": {
                    "params": {
                        "workflow": "txt2img",
                        "priority": "low",
                        "outputFormat": "jpeg",
                        "ecosystem": "Anima",
                        "seed": 1674487023,
                        "aspectRatio": {
                            "value": "1:1",
                            "width": 1024,
                            "height": 1024
                        },
                        "cfgScale": 5,
                        "steps": 40,
                        "sampler": "er_sde",
                        "scheduler": "simple",
                        "prompt": "masterpiece, best quality, score_9, score_8，highres, absurdres, official artgiantess, sitting, barefoot, she is much larger than skyscraper, city, destruction, building, skyscraper, bridge, highway, people, vulva",
                        "negativePrompt": "score_1, score_2, score_3,bad anatomy, bad proportions, deformed anatomy, deformed face, deformed eyes, text, multiple fingers,watermark,artist name",
                        "quantity": 1
                    },
                    "resources": [
                        {
                            "id": 2945208,
                            "name": "base-v1.0",
                            "trainedWords": [],
                            "baseModel": "Anima",
                            "availability": "Public",
                            "status": "Published",
                            "usageControl": "Download",
                            "licensingFee": 5,
                            "covered": true,
                            "hasAccess": true,
                            "model": {
                                "id": 2458426,
                                "name": "Anima",
                                "type": "Checkpoint",
                                "nsfw": false,
                                "poi": false,
                                "minor": false,
                                "userId": 11347132,
                                "sfwOnly": false
                            },
                            "minStrength": -1,
                            "maxStrength": 2,
                            "strength": 1,
                            "canGenerate": true,
                            "isOwnedByUser": false,
                            "isPrivate": false,
                            "fileSizeKB": 4084198,
                            "additionalResourceCost": false,
                            "air": "urn:air:anima:checkpoint:civitai:2458426@2945208",
                            "substitute": null
                        },
                        {
                            "id": 2964979,
                            "name": "anima-v0",
                            "trainedWords": [
                                "giantess"
                            ],
                            "baseModel": "Anima",
                            "availability": "Public",
                            "status": "Published",
                            "usageControl": "Download",
                            "licensingFee": 0,
                            "covered": true,
                            "hasAccess": true,
                            "model": {
                                "id": 199258,
                                "name": "Giantess",
                                "type": "LORA",
                                "nsfw": false,
                                "poi": false,
                                "minor": false,
                                "userId": 472669,
                                "sfwOnly": false
                            },
                            "minStrength": -1,
                            "maxStrength": 1,
                            "strength": 1,
                            "canGenerate": true,
                            "isOwnedByUser": false,
                            "isPrivate": false,
                            "fileSizeKB": 135459,
                            "additionalResourceCost": true,
                            "air": "urn:air:anima:lora:civitai:199258@2964979",
                            "substitute": null
                        }
                    ]
                },
                "steps": [
                    {
                        "$type": "imageGen",
                        "name": "$0",
                        "status": "scheduled",
                        "timeout": "00:21:00",
                        "completedAt": null,
                        "queuePosition": {
                            "support": "available",
                            "precedingJobs": 0,
                            "startAt": "2026-05-25T23:21:29.2964311Z",
                            "completeAt": "2026-05-25T23:21:51.3927483Z"
                        },
                        "metadata": {},
                        "output": [
                            {
                                "id": "72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg",
                                "seed": 1674487023,
                                "available": false,
                                "urlExpiresAt": "2027-05-25T23:21:19.5989604Z",
                                "nsfwLevel": null,
                                "blockedReason": null,
                                "type": "image",
                                "url": "https://orchestration-new.civitai.com/v2/consumer/blobs/72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZibKogjEyv3io9cOVHjF8E7DpkyRuPkswFxhrim4BUHOsUmrD_bqezbW5mWO-TRE2jJHzogr1oqSoDOE9YAfoYIHRj42gRPqob50754VUfVQYrq_4B8HSDfRlbEZG2W7XtgOzvJ0eJUxq5EL7HNtYtFldYZYm19bCPMXP9eCuIvNEBMUUTmqKSX2BpMGrFha_3yW3DrKdl-qfBdmze183tXbNS0A-_NAyVC9ZSPfsNSj2H-BHxfxswT1UMk15f1RQwajzumDQ-z09eVIFi66uR7Sba5s09KenRbi2whEQCrIRA&exp=2027-05-25T23:21:19.5989604Z",
                                "width": 1024,
                                "height": 1024,
                                "aspect": 1,
                                "previewUrl": "https://orchestration-new.civitai.com/v2/consumer/blobs/72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZib5Wsm0mZEQJesyPFSMkBrF2SO4nOuOvb9fdSLUYBcFnW07v9uLPv8t_Y3v0-QvPFI8ZBGE_6YkSwFNfQjCGg7R8S_iaVwagaVnPsQR0WEpGBG9TqnP4mcESHdEx-Ujyd-vwrnhlYrxvwlgios83jP8kg_r2yvzXPPRJYn1j6vxwkAZQfKhRCUNjauXGcFgQC_jNBdBR8zKDSYVeU-Wl4urKlW8mjiZGz-dNrk97QNvNAg9u3XL1R-5W-nx9hoV-n6FzCqOXipIGBPEoqBHTOhLQHcLod9TEk8Ao_vZEBWbN41NXgUJ_jBVYpnNvd2Qrjk&exp=2027-05-25T23:21:19.5990147Z",
                                "previewUrlExpiresAt": "2027-05-25T23:21:19.5990147Z"
                            }
                        ],
                        "images": [
                            {
                                "id": "72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg",
                                "seed": 1674487023,
                                "available": false,
                                "urlExpiresAt": "2027-05-25T23:21:19.5989604Z",
                                "nsfwLevel": null,
                                "blockedReason": null,
                                "type": "image",
                                "url": "https://orchestration-new.civitai.com/v2/consumer/blobs/72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZibKogjEyv3io9cOVHjF8E7DpkyRuPkswFxhrim4BUHOsUmrD_bqezbW5mWO-TRE2jJHzogr1oqSoDOE9YAfoYIHRj42gRPqob50754VUfVQYrq_4B8HSDfRlbEZG2W7XtgOzvJ0eJUxq5EL7HNtYtFldYZYm19bCPMXP9eCuIvNEBMUUTmqKSX2BpMGrFha_3yW3DrKdl-qfBdmze183tXbNS0A-_NAyVC9ZSPfsNSj2H-BHxfxswT1UMk15f1RQwajzumDQ-z09eVIFi66uR7Sba5s09KenRbi2whEQCrIRA&exp=2027-05-25T23:21:19.5989604Z",
                                "width": 1024,
                                "height": 1024,
                                "aspect": 1,
                                "previewUrl": "https://orchestration-new.civitai.com/v2/consumer/blobs/72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZib5Wsm0mZEQJesyPFSMkBrF2SO4nOuOvb9fdSLUYBcFnW07v9uLPv8t_Y3v0-QvPFI8ZBGE_6YkSwFNfQjCGg7R8S_iaVwagaVnPsQR0WEpGBG9TqnP4mcESHdEx-Ujyd-vwrnhlYrxvwlgios83jP8kg_r2yvzXPPRJYn1j6vxwkAZQfKhRCUNjauXGcFgQC_jNBdBR8zKDSYVeU-Wl4urKlW8mjiZGz-dNrk97QNvNAg9u3XL1R-5W-nx9hoV-n6FzCqOXipIGBPEoqBHTOhLQHcLod9TEk8Ao_vZEBWbN41NXgUJ_jBVYpnNvd2Qrjk&exp=2027-05-25T23:21:19.5990147Z",
                                "previewUrlExpiresAt": "2027-05-25T23:21:19.5990147Z"
                            }
                        ],
                        "errors": null
                    }
                ]
            },
            "meta": {
                "values": {
                    "createdAt": [
                        "Date"
                    ],
                    "duration": [
                        "undefined"
                    ],
                    "metadata.resources.0.substitute": [
                        "undefined"
                    ],
                    "metadata.resources.1.substitute": [
                        "undefined"
                    ],
                    "steps.0.completedAt": [
                        "undefined"
                    ],
                    "steps.0.output.0.nsfwLevel": [
                        "undefined"
                    ],
                    "steps.0.output.0.blockedReason": [
                        "undefined"
                    ],
                    "steps.0.images.0.nsfwLevel": [
                        "undefined"
                    ],
                    "steps.0.images.0.blockedReason": [
                        "undefined"
                    ],
                    "steps.0.errors": [
                        "undefined"
                    ]
                },
                "referentialEqualities": {
                    "steps.0.output": [
                        "steps.0.images"
                    ],
                    "steps.0.output.0": [
                        "steps.0.images.0"
                    ]
                }
            }
        }
    }
}

---

https://civitai.red/api/trpc/orchestrator.statusUpdate?input=%7B%22json%22%3A%7B%22workflowId%22%3A%229005769-20260525232119460%22%2C%22authed%22%3Atrue%7D%7D
Request Method
GET

Response
{
    "result": {
        "data": {
            "json": {
                "id": "9005769-20260525232119460",
                "status": "processing",
                "steps": [
                    {
                        "name": "$0",
                        "status": "processing",
                        "completedAt": null,
                        "output": [
                            {
                                "id": "72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg",
                                "seed": 1674487023,
                                "available": false,
                                "urlExpiresAt": "2027-05-25T23:21:21.001312Z",
                                "nsfwLevel": null,
                                "blockedReason": null,
                                "type": "image",
                                "url": "https://orchestration-new.civitai.com/v2/consumer/blobs/72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZib71jVEp46kaIfAv0WIBQoEP1iUhnRfc6z73LilrLB20vHtrbIQz6YgIW5H7U0BZFwbwcb1WVeOlsaiB5lg6PIJm40YVpyZqoQVG7bGNtopA24DwxN4oFXrNMo3rb23W1BvbiVXf6HK-Q_Mpao832iDjjTferxXVYw_hWBpinLwwHeqAkiQuXn6UdTKIdEakDYm7BEg5golfCwYBSZT9KVyeRPb28N_Kwjg_R7whJsdEJdEzg61LpMaJMon3GdpCnn7oV68LX0CJFclx_dw9sRqXGYMt4ZZgHIFSLsH7W7blw&exp=2027-05-25T23:21:21.0013120Z",
                                "width": 1024,
                                "height": 1024,
                                "aspect": 1,
                                "previewUrl": "https://orchestration-new.civitai.com/v2/consumer/blobs/72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZib_xF9PGe8g4S8ClImnnxp8AptUd080m-bTwpPJopqswN0JOQVBk2NqISlB3EGHqjqHesHDDzE-QZJmUoGUxp-j6iwOnYQS8eZZ5CW5pmnAs0Zlu_ypKpSjh64WOduWC3WCFhChc8NZPZ9BP-Wwejtx-fEfSB6O5nCaXHBV0RUIhC2OloYaNI1_sA_MJMdyEcrqGuvtjcskC6H6OuJG-HSgMC0ZMVf_9tJro1iYQwlKjxRgAuShGZ72lt9cSP_a9PzeYf-_xWPZo3_JSVbGNyDmHhaxO-YoQh5WX8Gv9XCbspCsKm89EC1sEHmfz1Vxvps&exp=2027-05-25T23:21:21.0013648Z",
                                "previewUrlExpiresAt": "2027-05-25T23:21:21.0013648Z"
                            }
                        ],
                        "images": [
                            {
                                "id": "72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg",
                                "seed": 1674487023,
                                "available": false,
                                "urlExpiresAt": "2027-05-25T23:21:21.001312Z",
                                "nsfwLevel": null,
                                "blockedReason": null,
                                "type": "image",
                                "url": "https://orchestration-new.civitai.com/v2/consumer/blobs/72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZib71jVEp46kaIfAv0WIBQoEP1iUhnRfc6z73LilrLB20vHtrbIQz6YgIW5H7U0BZFwbwcb1WVeOlsaiB5lg6PIJm40YVpyZqoQVG7bGNtopA24DwxN4oFXrNMo3rb23W1BvbiVXf6HK-Q_Mpao832iDjjTferxXVYw_hWBpinLwwHeqAkiQuXn6UdTKIdEakDYm7BEg5golfCwYBSZT9KVyeRPb28N_Kwjg_R7whJsdEJdEzg61LpMaJMon3GdpCnn7oV68LX0CJFclx_dw9sRqXGYMt4ZZgHIFSLsH7W7blw&exp=2027-05-25T23:21:21.0013120Z",
                                "width": 1024,
                                "height": 1024,
                                "aspect": 1,
                                "previewUrl": "https://orchestration-new.civitai.com/v2/consumer/blobs/72bb48c5-4362-46c4-b455-ff0da2414f46-0.jpg?sig=CfDJ8EVzXboigx9EiFXpbVmCZib_xF9PGe8g4S8ClImnnxp8AptUd080m-bTwpPJopqswN0JOQVBk2NqISlB3EGHqjqHesHDDzE-QZJmUoGUxp-j6iwOnYQS8eZZ5CW5pmnAs0Zlu_ypKpSjh64WOduWC3WCFhChc8NZPZ9BP-Wwejtx-fEfSB6O5nCaXHBV0RUIhC2OloYaNI1_sA_MJMdyEcrqGuvtjcskC6H6OuJG-HSgMC0ZMVf_9tJro1iYQwlKjxRgAuShGZ72lt9cSP_a9PzeYf-_xWPZo3_JSVbGNyDmHhaxO-YoQh5WX8Gv9XCbspCsKm89EC1sEHmfz1Vxvps&exp=2027-05-25T23:21:21.0013648Z",
                                "previewUrlExpiresAt": "2027-05-25T23:21:21.0013648Z"
                            }
                        ],
                        "errors": null
                    }
                ]
            },
            "meta": {
                "values": {
                    "steps.0.completedAt": [
                        "undefined"
                    ],
                    "steps.0.output.0.nsfwLevel": [
                        "undefined"
                    ],
                    "steps.0.output.0.blockedReason": [
                        "undefined"
                    ],
                    "steps.0.images.0.nsfwLevel": [
                        "undefined"
                    ],
                    "steps.0.images.0.blockedReason": [
                        "undefined"
                    ],
                    "steps.0.errors": [
                        "undefined"
                    ]
                },
                "referentialEqualities": {
                    "steps.0.output": [
                        "steps.0.images"
                    ],
                    "steps.0.output.0": [
                        "steps.0.images.0"
                    ]
                }
            }
        }
    }
}