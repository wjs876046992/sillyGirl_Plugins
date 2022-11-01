/*
* @author https://t.me/sillyGirl_Plugin
* @version v1.0.0
* @create_at 2022-09-08 15:06:22
* @description 获取京东短链真实链接,直接发送短链即可
* @title 京东短链转长链
* @platform qq wx tg pgm sxg
* @rule raw https://u\.jd\.com/\w+
* @admin true
 * @public false
* @priority 9
*/

const s = sender
const st=require("something")

function main(){
    let data= request(s.getContent())
    
    let url=data.body.match(/(?<=hrl=')https:\/\/u\.jd\.com[^']+/)
    if(url){
        url=url[0]
        data=request({
            url:url,
            method:"get",
            allowredirects: false, 
        })
        if(data.status==302){
            let imType=s.getPlatform()
            if(imType=="pgm")
                s.reply(st.ToEasyCopy(imType,"原始链接",data.headers["Location"]))
            else if(imType=="tg"){
                let msg=st.ToEasyCopy(imType,"原始链接",data.headers["Location"])
                if(s.getChatId())
                    st.SendToTG(s.getChatId(),msg)
                else
                    st.SendToTG(s.getUserId(),msg)
            }
            else
                s.reply("原始链接：\n"+data.headers["Location"])
        }
    }
    s.continue()
    return
}


main()