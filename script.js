// YoutubeのチャンネルID
const youtubeId = "UCJxtUcrOc1yyG7ZzJKBtTUA";
// APIキー(by Google Cloud)
const apiKey = "AIzaSyAcvkG759mbzrz-Xkoh0YdwSybBgwYeybA";
// Google Spread Sheetデータ取得用のAPIのURL
const gsendpoint = "https://script.google.com/macros/s/AKfycbxIaQ6fbvHINLb4pdBMsrXVcWnpeRGsa9jqwUXQNtKQWNh_SbA5kTHUQ1o7_NvpMGF4Hg/exec";
// プレイリザルトデータ(by Google Spread Sheet)
let playResult;

let userId;

/**
 * 初期表示処理
 */
function init(){

	document.getElementById("spinner").style.display = "flex";
	
	userId = document.getElementById("user").value;
	
	console.log("init start." + userId);
	// localStorageからプレイリザルト取得
	const playResultJson = localStorage.getItem(userId);
	// 取得できた場合
	if(playResultJson){
		// ローカル変数に保持
		playResult = JSON.parse(playResultJson);
		// Youtubeチャンネルの検索
		seekYoutubeChannel();
	// 取得できなかった場合
	}else{
		// Google spreadsheetデータをロードする
		fetch(gsendpoint + "?type=getPlayResult&id=" + userId).
		then(response => response.json()).
		then(data => {
		
			console.log("playResult loaded.");
			// localStorageに楽曲データを退避
			localStorage.setItem(userId, JSON.stringify(data));
			// ローカル変数に保持
			playResult = data;
			// youtubeチャンネルの検索
			seekYoutubeChannel();
		});
	}
}

/**
 * Youtubeチャンネルの検索
 */
function seekYoutubeChannel(){
	// localStorageからYoutubeプレイリストを取得
	const strJson = localStorage.getItem("playlist");
	// 取得できた場合
	if(strJson){
		// 画面出力
		displayData();
	// 取得できなかった場合
	}else{
		// ローカルストレージデータの初期化
		localStorage.setItem("playlist", JSON.stringify([]));
		// Youtubeチャンネル情報を取得
		fetch("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=" + youtubeId + "&key=" + apiKey).
		then(response => response.json()).
		then(data => {
			// プレイリストIDの取得
			const playlistId = data.items[0].contentDetails.relatedPlaylists.uploads;
			// Youtubeにアップロードされている動画リストの取得
			getYoutubeList(playlistId);
		});
	}
}

/**
 * Youtubeにアップロードされている動画リストの取得
 */
function getYoutubeList(playlistId){

	console.log("getYoutubeList start.");
	// Youtubeにアップロードされている動画リストを取得 条件：プレイリストID
	fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=" + playlistId + "&key=" + apiKey + "&maxResults=50").
	then(response => response.json()).
	then(data => {
		// localStorageにデータを保存
		setData(data);
		// 次ページのトークンがある場合
		if(data.nextPageToken){
			// 次ページの動画リストの取得
			getNextList(playlistId, data.nextPageToken);
		}
	});
}

/**
 * 次ページの動画リストの取得
 */
function getNextList(playlistId, pageToken){

	console.log("getNextList start.");
	// Youtubeにアップロードされている動画リストの取得 条件：プレイリストID+ページトークン
	fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=" + playlistId + "&pageToken=" + pageToken + "&key=" + apiKey + "&maxResults=50").
	then(response => response.json()).
	then(data => {
		// localStorageにデータを保存
		setData(data);
		// 次ページのトークンがある場合
		if(data.nextPageToken){
			// 次ページの動画リストの取得　※再帰
			getNextList(playlistId, data.nextPageToken);
		// 次ページのトークンがない場合
		}else{
			// 画面出力
			displayData();
		}
	});
}

/**
 * localStorageにデータを保存
 */
function setData(data){
	// localStorageからデータを取得
	const storageList = JSON.parse(localStorage.getItem("playlist"));
	// プレイリストループ
	for(const item of data.items){
		// 成形してリストに追加
		storageList.push({
			title:item.snippet.title,
			videoId:item.snippet.resourceId.videoId
		});
	}
	// リストを書き戻す
	localStorage.setItem("playlist", JSON.stringify(storageList));
}

/**
 * 画面出力
 */
function displayData(){

	console.log("displayData start.");
	
	console.log(playResult);
	// 出力領域を取得
	const dt = document.getElementById("dt");
	// 出力をリセット
	dt.innerHTML = null;
	// Youtubeプレイリスト取得
	const storageList = JSON.parse(localStorage.getItem("playlist"));
	// ソートする
	storageList.sort(sortFunc);
	// 取得結果ループ
	for(const item of storageList){
		// 行生成
		const row = document.createElement("tr");
		// イベントリスナ追加（マウスオーバー、マウスアウトによる色変更）
		row.addEventListener("mouseover", function(e){
			e.currentTarget.style.color = "#FF0000";
			e.currentTarget.style.backgroundColor = "#F0F0F0";
		});
		row.addEventListener("mouseout", function(e){
			e.currentTarget.style.color = "black";
			e.currentTarget.style.backgroundColor = "white";
		});
		// タイトル表示セル生成
		const title = document.createElement("td");
		// タイトル設定
		title.innerText = item.title;
		// 行にセル追加
		row.appendChild(title);
		// タイトル編集　※[LV]曲名(オプション指定)+αの形式から曲名のみ抽出
		const realTitle = getTitle(item.title);
		// セル生成
		const cell = document.createElement("td");
		// 編集後の曲名を追加
		cell.innerText = realTitle;
		// 行にセル追加
		row.appendChild(cell);
		// YoutubeのvideoIdセル生成
		const videoId = document.createElement("td");
		// リンクに編集してセルに追加
		videoId.innerHTML = "<a target='_blank' href='https://www.youtube.com/watch?v=" + item.videoId + "'>" + item.videoId + "</a>";
		// 行にセル追加
		row.appendChild(videoId);
		// Google Spread Sheetデータとのマッチング結果表示セル生成
		const finder = document.createElement("td");
		// プレイリザルトデータとのマッチング
		const findResult = playResult.find(data => data.TITLE == realTitle);
		// 検出結果
		let type = "";
		// 同名のプレイリザルトあり
		if(findResult){
			// タイトルに†が含まれている場合
			if(item.title.includes("†")){
				// レジェンダリアデータに動画URL指定がされている場合
				if(findResult.SPL && findResult.SPL.MV){
					// 連携済
					finder.innerHTML = "<a id='" + item.videoId + "' name='" + escapeSingleQuote(realTitle) + "' type='SPL' href='javascript:void(0);' onclick='save();'>済</a>";
					// 検出結果にも退避
					type = "済";
					// 行にセル追加
					row.append(finder);
					// 行に空セル追加
					const blankCell = document.createElement("td");
					blankCell.innerHTML = "&nbsp;";
					row.appendChild(blankCell);
				// 動画URL指定されていない場合
				}else{
					// 検出結果＝未連携
					type = "未";
					// 反映処理をキックするためのリンク機能を付与　※'はHTMLエスケープする
					finder.innerHTML = "<a id='" + item.videoId + "' name='" + escapeSingleQuote(realTitle) + "' type='SPL' href='javascript:void(0);' onclick='save();'>未</a>";
					// 行にセル追加
					row.append(finder);
					// バルク処理用のチェックボックスセル準備
					const chkbox = document.createElement("td");
					// バルク処理用のチェックボックスを追加　※'はHTMLエスケープする
					chkbox.innerHTML = "<input name='bulk' type='checkbox' value='" + escapeSingleQuote(realTitle) + ",SPL," + item.videoId + "'>"
					// 行にセル追加
					row.appendChild(chkbox);
				}
			// タイトルに†が含まれていない場合
			}else{
				// アナザーデータに動画URLが指定されている場合
				if(findResult.SPA && findResult.SPA.MV){
					// 連携済
					finder.innerHTML = "<a id='" + item.videoId + "' name='" + escapeSingleQuote(realTitle) + "' type='SPA' href='javascript:void(0);' onclick='save();'>済</a>";
					// 検出結果にも退避
					type = "済";
					// 行にセル追加
					row.append(finder);
					// 行に空セル追加
					const blankCell = document.createElement("td");
					blankCell.innerHTML = "&nbsp;";
					row.appendChild(blankCell);
				// 動画URL指定されていない場合
				}else{
					// 検出結果＝未連携
					type = "未";
					// 反映処理をキックするためのリンク機能を付与　※'はHTMLエスケープする
					finder.innerHTML = "<a id='" + item.videoId + "' name='" + escapeSingleQuote(realTitle) + "' type='SPA' href='javascript:void(0);' onclick='save();'>未</a>";
					// 行にセル追加
					row.append(finder);
					// バルク処理用のチェックボックスセル準備
					const chkbox = document.createElement("td");
					// バルク処理用のチェックボックスを追加　※'はHTMLエスケープする
					chkbox.innerHTML = "<input name='bulk' type='checkbox' value='" + escapeSingleQuote(realTitle) + ",SPA," + item.videoId + "'>";
					// 行にセル追加
					row.appendChild(chkbox);
				}
			}
		// 同名のプレイリザルトなし
		}else{
			// 連携不可
			finder.innerText = "×";
			// 検出結果＝未検出
			type = "×";
			// 行にセル追加
			row.append(finder);
			// 行に空セル追加
			const blankCell = document.createElement("td");
			blankCell.innerHTML = "&nbsp;";
			row.appendChild(blankCell);
		}

		if(document.getElementById("exAC").checked && item.title.startsWith("AC"))continue;
		// 「済を除外」にチェックされていて検出結果が済（連携済）の場合、表示しない（表示領域に行を追加する処理をスキップ）
		if(document.getElementById("exConnected").checked && type == "済")continue;
		// 「×を除外」にチェックされていて検出結果が×（未検出）の場合、表示しない（表示領域に行を追加する処理をスキップ）
		if(document.getElementById("exNoData").checked && type == "×")continue;
		// 「乱以外除外」にチェックされていてタイトルにRANDOMの文字が含まれていない場合、表示しない（表示領域に行を追加する処理をスキップ）
		if(document.getElementById("exNotRandom").checked && !item.title.includes("RANDOM"))continue;
		// 「乱を除外」にチェックされていてタイトルにRANDOMの文字が含まれている場合、表示しない（表示領域に行を追加する処理をスキップ）
		if(document.getElementById("exRandom").checked && item.title.includes("RANDOM"))continue;
		// 表示領域に行を追加
		dt.appendChild(row);
	}
	
	document.getElementById("spinner").style.display = "none";
}
/**
 * タイトルから曲名を抽出
 */
function getTitle(title){
	// [LV]部分、及び†表記を除去
	let ret = title.replace(/\[[0-9]+\]/, "").replace("†", "");
	// 文字列の最後尾から見ていく
	for(let i = ret.length; i >= 0; i--){
		// (の文字があった場合
		if(ret.substring(i, i + 1) == "("){
			// そこの前までを返却
			ret = ret.substring(0, i);
			// 以後処理不要
			break;
		}
	}
	// 結果返却
	return ret;
}

/**
 * パラメータに入れ込む際にシングルクォートをHTMLエスケープする
 */
function escapeSingleQuote(value){
	return value.replace("'", "&#39;");
}
/**
 * ソート用
 */
function sortFunc(a, b){

	const aLvDisp = a.title.match(/\[[0-9]+\]/);
	const aLv = ((aLvDisp == null || aLvDisp.length <= 0) ? 0 : parseInt(aLvDisp[0].replace("[", "").replace("]", "")));
	const bLvDisp = b.title.match(/\[[0-9]+\]/);
	const bLv = ((bLvDisp == null || bLvDisp.length <= 0) ? 0 : parseInt(bLvDisp[0].replace("[", "").replace("]", "")));
	// LVによるソート
	if(aLv < bLv){
		return -1;
	}else if(aLv > bLv){
		return 1;
	}
	// タイトル文字列によるソート
	if(a.title < b.title){
		return -1;
	}else if(a.title > b.title){
		return 1;
	}
	// 同LV、且つ同名なら同値
	return 0;
}


/**
 * 保存処理
 */
function save(){

	document.getElementById("spinner").style.display = "flex";
	try{
		// 保存用にデータを成型し、Google SpreadSheet更新
		fetch(
			gsendpoint + "?id=" + userId,
			{
				method:"POST",
				mode:"no-cors",
				headers:{'Content-Type':'application/json'},
				body:JSON.stringify([{
					TITLE:event.target.name,
					TYPE:event.target.type,
					MV:"https://www.youtube.com/watch?v=" + event.target.id
				}])
			}
		).
		then(data => {
			console.log("save finished.");
			localStorage.removeItem(userId);
			init();
		});
	}catch(e){
		console.log("ERROR:" + e.message);
	}
}
/**
 * バルク保存処理
 */
function bulksave(){
	document.getElementById("spinner").style.display = "flex";
	// チェックボックス取得
	const chkboxes = document.getElementsByName("bulk");
	// 更新用のリスト
	const updateList = new Array();
	// 全チェックボックスループ
	for(const chkbox of chkboxes){
		// チェックされている場合
		if(chkbox.checked){
			// 値が,指定されているため、,で分割
			const inputData = chkbox.value.split(",");
			// 更新用リストに成形して追加
			updateList.push({
				TITLE:inputData[0],
				TYPE:inputData[1],
				MV:"https://www.youtube.com/watch?v=" + inputData[2]
			});
		}
	}
	
	console.log(updateList);
	
	try{
		// Google SpreadSheet更新
		fetch(
			gsendpoint + "?id=" + userId,
			{
				method:"POST",
				mode:"no-cors",
				headers:{'Content-Type':'application/json'},
				body:JSON.stringify(updateList)
			}
		).
		then(data => {
			console.log("save finished.");
			localStorage.removeItem(userId);
			init();
		});
	}catch(e){
		console.log("ERROR:" + e.message);
	}
}