/*
* @author https://t.me/sillyGirl_Plugin
* @version v1.0.0
* @create_at 2022-09-08 15:06:22
* @description 饿了么提交与查询
* @title 饿了么
* @rule elm ?
* @rule 饿了么
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

//允许使用本插件的群聊白名单
const GroupWhiteList=[]
/****************************** */



const s = sender
const ql=require("qinglong")
const db=new Bucket("elm_bind")

function main(){
    if(s.getChatId() && GroupWhiteList.indexOf(s.getChatId())==-1){
        console.log("非白名单群聊，禁止使用")
        return
    }

    let token=ql.Get_QL_Token(Host,CilentID,CilentSecrect)
    if(!token){
        s.reply("token获取失败")
        return
    }
    let envs=ql.Get_QL_Envs(Host,token)
    if(!envs){
        s.reply("青龙变量获取失败")
        return
    }

    if(s.getContent()=="饿了么"){
        let uid=function (){
            let ids=db.keys()
            for(let i=0;i<ids.length;i++){
                if(db.get(ids[i])==s.getUserId())
                    return ids[i]
            }
        }()
        let find=false
        for(let i=0;i<envs.length;i++){
            if(envs[i].name==EnvName){
                let eid=envs[i].value.match(/(?<=USERID=)\d+/)
                if(eid && eid==uid){
                    find=true
                    let bean_info=Get_ElmBeans(envs[i].value)
                    let user_info=Get_ElmUserInfo(envs[i].value)
                    if(bean_info && user_info){
                        let msg="账号："+user_info.username
                        msg+="\n吃货豆总数："+bean_info.amount
                        msg+="\n今日收入："+bean_info.increment
                        s.reply(msg)
                    }
                    else{
                        s.reply("查询失败")
                    }
                }
            }
        }
        if(!find)
            s.reply("未绑定饿了么账号")
    }
    else{

        let ck=s.param(1)
        if(ck.indexOf("SID")==-1 || ck.indexOf("cookie2")==-1 || ck.indexOf("USERID")==-1){
            s.reply("ck有误或者不完整")
            return
        }
        let uid=ck.match(/(?<=USERID=)\d+/)[0]
        let find=false
        for(let i=0;i<envs.length;i++){
            if(envs[i].name==EnvName){
                let eid=envs[i].value.match(/(?<=USERID=)\d+/)
                if(eid && eid[0]==uid){
                    find=true
                    if(envs[i].id)
                        env_id=envs[i].id
                    else
                        env_id=envs[i]._id
                    if(ql.Update_QL_Env(Host,token,env_id,envs[i].name,ck,envs[i].remarks)){
                        db.set(uid,s.getUserId())
                        s.reply("更新成功")
                        return
                    }
                }
            }
        }
        if(!find){
            if(ql.Add_QL_Env(Host,token,[{
                    name:EnvName,
                    value:ck,
                    remarks:s.getPlatform()+":"+s.getUserId()
                }])){
                db.set(uid,s.getUserId())
                s.reply("添加成功")
                return
            }
        }
        s.reply("提交失败")
    }
}

function Get_ElmBeans(ck){
    let resp=request({
        url:"https://h5.ele.me/restapi/svip_biz/v1/supervip/foodie/records?offset=0&limit=100",
		method:"get",
        headers:{
            Cookie:ck
        }
    })
	try{
        let info=JSON.parse(resp.body)
        let increment=0,decrement=0
		let day0=null
		for(let i=0;i<info.records.length;i++){
			let day=info.records[i].createdTime.match(/(?<=-)\d{1,2}(?= )/)[0]
			if(!day0)
				day0=day
			if(day == day0){
                if(info.records[i].bizType=="USE")
                    decrement+=info.records[i].count
                else
				    increment+=info.records[i].count
            }
			else
				break
		}
    	return {
                	amount:info.peaCount,
                	increment:increment
        		}
	}
	catch(err){
		return null
	}
}
function Get_ElmUserInfo(ck){
    let resp=request({
        url:"https://restapi.ele.me/eus/v4/user_mini",
		method:"get",
        headers:{
            Cookie:ck
        }
    })
    try{
        return JSON.parse(resp.body)
    }
    catch(err){
        return null
    }
}
main()