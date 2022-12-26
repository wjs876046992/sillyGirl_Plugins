/*
* @author https://t.me/sillyGirl_Plugin
* @version v1.0.0
* @create_at 2022-09-08 15:06:22
* @description 查询本人绑定京东账户最近x天的收入详情，须安装something与qinglong模块，例:最近30天收入
* @title 京豆详情
* @platform qq wx tg pgm sxg
* @rule 最近\d+天收入
 * @public false
*/

const s = sender
const db= new Bucket("qinglong")
const ql=require("qinglong")
const st=require("something")

function main(){
    let days=Number(s.getContent().match(/\d+/g)[0]);
	let QLS=ql.QLS()
	if(!QLS){
		s.reply("查询失败，请联系管理员")//未对接青龙
		return
	}
	let bind=st.GetBind(s.getPlatform(),s.getUserId())//获取该用户所绑定的pin
	if(bind.length==0){
		s.reply("获取绑定信息失败或您未绑定本平台")
		return
	}
	let tipid=s.reply("正在查询,请稍等...");
	for(let i=0;i<QLS.length;i++){
		let ql_host=QLS[i].host
		let ql_token=QLS[i].token
		if(!ql_token){
			s.reply("容器"+QLS[i].name+"token获取失败,跳过\n")
			continue 
		}
		let envs=ql.Get_QL_Envs(ql_host,ql_token)
        if(envs==null)
            continue
		for(let j=0;j<envs.length && bind.length;j++){
			if(envs[j].name!="JD_COOKIE")
				continue
			for(let k=0;k<bind.length;k++){
				let pin=envs[j].value.match(/(?<=pt_pin=)[^;]+/g)
				if(pin==bind[k]){
					let msg=""
					if(envs[j].status==1)
						msg="账号【"+GetName(envs[j].value)+"】已失效"
					else{
						let info=st.JD_BeanInfo(envs[j].value,days)
						if(info==null){
							s.reply("账号【"+GetName(envs[j].value+"】京豆数据获取失败"))
							continue
						}
						let infosum=[]	//各项收入统计
						let sum=0,expire=0	//总收入与过期
						info.forEach((value, index, array)=>{
							//console.log(JSON.stringify(value)+"\n\n"+JSON.stringify(infosum))
							let find=infosum.findIndex((value2, index2, array2)=>value.eventMassage==value2.eventMassage)
							//console.log(find)
							if(find==-1)
								infosum.push({eventMassage:value.eventMassage,amount:Number(value.amount)})
							else
								infosum[find].amount+=Number(value.amount)	
						})
						infosum.sort((a,b)=>b.amount-a.amount)
						infosum.forEach((value, index, array)=>{
							sum+=value.amount
							if(value.amount>50)
								msg+=value.amount+" "+value.eventMassage+"\n"
							else if(value.amount<0)
								expire+=value.amount
						})
						msg="-------账号【"+GetName(envs[j].value)+"】---------\n★净收入【"+sum+"】豆\n☆过期/使用【"+expire+"】豆\n"+msg+"...\n\n"
						bind.splice(k,1)//将已通知的pin从bind删除，以免重复通知			
					}
					s.reply(msg)
					sleep(2000)
					break
				}
			}
		}		
	}
}


//获取ck对应账号通知时使用的称呼
function GetName(ck){
	let pin=ck.match(/(?<=pin=)[^;]+(?=;)/g)
	let userInfo=st.JD_UserInfo(ck)
	if(userInfo!=null)//直接从京东获取到昵称
		return userInfo.userInfo.baseInfo.nickname
	else{
		//从保存的昵称记录中获取昵称
		let pinNames=(new Bucket("jd_cookie")).get("pinName")
		if(pinNames!=""){
			let data=JSON.parse(pinNames)
			for(let i=0;i<data.length;i++)
				if(data[i].pin==pin)
					return data[i].name			
		}
		//未在记录中找到昵称，使用pin通知
		if(pin.indexOf("%")!=-1)
			return decodeURI(pin) //中文pin
		else
			return pin
	}
}

main()
