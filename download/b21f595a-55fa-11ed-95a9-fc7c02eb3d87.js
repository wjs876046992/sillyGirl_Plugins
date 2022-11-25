/*
* @author https://t.me/sillyGirl_Plugin
* @version v1.0.0
* @create_at 2022-09-08 15:06:22
* @description 提交饿了么变量至青龙面板
* @title 饿了么提交
* @rule elm ?
 * @public false
*/

/***********配置************ */
//青龙面板地址
const Host="http://192.168.31.2:6700"
//青龙应用id
const CilentID="a_HXgcCWf0AC"
//青龙应用密钥
const CilentSecrect="Fj6Po7bF7N7eVAcBknx1x2-S"

//饿了么变量名
const EnvName="elmCookie"

//允许提交变量的群聊白名单
const GroupWhiteList=[]
/****************************** */



const s = sender
const ql=require("qinglong")


function main(){
    if(s.getChatId() && GroupWhiteList.indexOf(s.getChatId())==-1){
        console.log("非白名单群聊，禁止提交")
        return
    }

    let ck=s.param(1)
    if(ck.indexOf("SID")==-1 || ck.indexOf("cookie2")==-1 || ck.indexOf("USERID")==-1){
        s.reply("ck有误或者不完整")
        return
    }
    let uid=ck.match(/(?<=USERID=)\d+/)[0]

    let token=ql.Get_QL_Token(Host,CilentID,CilentSecrect)
    if(!token){
        s.reply("token获取失败")
        return
    }
    let envs=ql.Get_QL_Envs(Host,token)
    if(envs){
        for(let i=0;i<envs.length;i++){
            if(envs[i].name==EnvName){
                let eid=envs[i].value.match(/(?<=USERID=)\d+/)
                if(eid && eid[0]==uid){
                    if(envs[i].id)
                        env_id=envs[i].id
                    else
                        env_id=envs[i]._id
                    if(ql.Update_QL_Env(Host,token,env_id,envs[i].name,ck,envs[i].remarks)){
                        s.reply("更新成功")
                        return
                    }
                }
            }
        }
    }
    s.reply("更新失败")
}

main()