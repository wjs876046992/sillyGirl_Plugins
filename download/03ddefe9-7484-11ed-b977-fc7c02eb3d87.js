/*
* @author https://t.me/sillyGirl_Plugin
* @version v1.0.3
* @create_at 2022-09-08 15:06:22
* @description openAI人工智障，需设置token
* @title openAI
* @rule ai ?
 * @public false
*/

//请在openAI官网登陆完成后，点击右上角头像-View API keys创建token，并使用命令'set otto openAI_token ?'设置token

const s=sender

function main(){
    let limit=50
    let token=(new Bucket("otto").get("openAI_token"))
    if(!token){
        s.reply("请使用命令'set otto openAI_token ?'设置openAI的token")
        return
    }
    let text=s.param(1)
    while(limit-->0){
        let back=Completions(token,{
            "model": "text-davinci-003", 
            "prompt": text,
            "temperature": 0, 
            "max_tokens": 200
        })
        //console.log(JSON.stringify(back))
        if(!back){
            s.reply("网络错误")
            break
        }
        else{
            if(back.error){
                s.reply(back.error.message)
                break
            }
            else{
                try{
                    s.reply(back.choices[0].text)
                }
                catch(err){
                    s.reply("未知错误\n"+JSON.stringify(back))
                }
            }
        }
        let next=s.listen(60*1000)
        if(!next || next.getContent()=="q"){
            s.reply("退出对话")
            break
        }
        else
            text=next.getContent()
    }
}

/**
 * body={
 *      model:使用模型,
 *      prompt:ai提示，无此项则开启新会话
 *      ...
 * }
 */

function Completions(token,body){
	try{
		let data=request({
			url:"https://api.openai.com/v1/completions",
			method:"post",
			headers:{
				accept: "application/json",
				Authorization:"Bearer "+token
			},
            body:body
		})
		return JSON.parse(data.body)
	}
	catch(err){
		return null
	}
}

function GetModules(token){
	try{
		let data=request({
			url:"https://api.openai.com/v1/models",
			method:"get",
			headers:{
				accept: "application/json",
				Authorization:"Bearer "+token
			}
		})
		return JSON.parse(data.body)
	}
	catch(err){
		return null
	}
}

main()