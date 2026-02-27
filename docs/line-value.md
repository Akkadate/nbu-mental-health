https://liff.mentalhealth.northbkk.ac.th/verify


chanel access token
5xsB6v6sNze+fuaImuUeFJ86pitt+1/u904pD3BrSkaPN6rzE7+2MJq5NVrzyn5z9maXJ/umLZhUeK0wCjv0qBHxmrCfAiMsZJ5t+b5VMp45rVeJ2SYhsbRCEAB7Z/J/Y1A+wDgh5oDelW9p6GSUBgdB04t89/1O/w1cDnyilFU=

4.1 Create Rich Menu
Headers:
  + Authorization: Bearer {channel access token}
  + Content-Type: application/json
Endpoint: https://api.line.me/v2/bot/richmenu
Method: POST
Body:

ได้ Guest Rich Menu
{
    "richMenuId": "richmenu-9834dc09b3ce4e777d57ca220a0214f9"
}


4.2 Upload Rich Menu Image
Headers:
  + Authorization: Bearer {channel access token}
  + Content-Type: image/jpeg หรือ image/png
Endpoint: https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content
Method: POST
Param:
  + richMenuId: ID ของ Rich Menu ที่ได้จากข้อ 4.1

4.3 Set Default Rich Menu

Headers:
  + Authorization: Bearer {channel access token}
Endpoint: https://api.line.me/v2/bot/user/all/richmenu/{richMenuId}
Method: POST
Param:
  + richMenuId: ID ของ Rich Menu ที่ได้จากข้อ 4.1



-------------------------
***Verified Rich Menu
{
    "richMenuId": "richmenu-960cff2631662987cc6e8f92565e55d8"
}