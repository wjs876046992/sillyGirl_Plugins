/**
* @author https://t.me/sillyGirl_Plugin
* @version v1.0.0
* @create_at 2022-09-19 15:06:22
* @description nark对接，默认禁用,可填写默认上车服务器
* @title nark登陆
* @rule 登陆|登录
 * @public false
* @disable true
*/

//默认上车服务器序号
const DefaultQL=1

const ql=require("qinglong")

function main(){
	const s = sender
	const sillyGirl=new SillyGirl()
	const WAIT=60*1000
	const nark=(new Bucket("jd_cookie")).get("nolan_addr")
	if(nark==""){
		s.reply("未对接登陆，请联系管理员")
		return
	}
//	try{
		s.reply("请输入电话号码：")
		let inp1=s.listen(WAIT)
		if(inp1==null){
			s.reply("输入超时，请重新登陆")
			return null
		}
		let Tel=inp1.getContent()
		let resp1=request({
   			url:nark+"/api/SendSMS",
    		method:"post",
			body:{
  				"Phone": Tel,
  				"qlkey": 0
			}
		})
		//console.log(resp1)
		if(!JSON.parse(resp1.body).success){
			s.reply("手机号发送失败")
			return false
		}
		s.reply("请输入验证码：")
		let inp2=s.listen(WAIT)
		if(inp2==null){
			s.reply("输入超时，请重新登陆")
			return null
		}
		let resp2=request({
			url:nark+"/api/VerifyCode",
    		method:"post",
			body:{
 				"Phone": Tel,
 				"QQ": "",
 				"qlkey": 0,
  				"Code": inp2.getContent()
			}
		})
		let data=JSON.parse(resp2.body)
		if(!data.success){
			s.reply(data.message)
			return
		}
		let QLS=JSON.parse((new Bucket("qinglong")).get("QLS"))
		let ql_token=ql.Get_QL_Token(QLS[DefaultQL-1].host,QLS[DefaultQL-1].client_id,QLS[DefaultQL-1].client_secret)
		if(!ql_token){
			s.reply("token获取失败，上车失败")
			return
		}
		else
			console.log(data.data.ck)
		if(Submit_QL_Env(QLS[DefaultQL-1].host,ql_token,"JD_COOKIE",data.data.ck,"")){
			let pin=data.data.ck.match(/(?<=pin=)[^;]+/)[0]
			let imType=s.getPlatform()
			let bind=new Bucket("pin"+imType.toUpperCase())
			bind.set(pin,s.getUserId())
			sillyGirl.notifyMasters(pin+",已更新账号")
			s.reply("上车成功")
		}
		else
			s.reply("ck提交失败，上车失败")
	// }
	// catch(err){
	// 	return s.reply(err)
	// }
}

function Submit_QL_Env(host,token,name,value,remark){
	let envs=ql.Get_QL_Envs(host,token)
	if(envs==null)
		return false
	let pin=value.match(/(?<=pin=)[^;]+/)[0]
	let index=envs.findIndex(env=>env.name==name&&env.value.match(/(?<=pin=)[^;]+/)[0]==pin)
	if(index==-1)
		return ql.Add_QL_Env(host,token,{"name":name,"value":value,"remarks":remark})
	else{
		if(typeof(envs[index].id)=="number")
			return ql.Update_QL_Env(host,token,envs[index].id,name,value,envs[index].remarks)
		else
			return ql.Update_QL_Env(host,token,envs[index]._id,name,value,envs[index].remarks)
	}
}

main()