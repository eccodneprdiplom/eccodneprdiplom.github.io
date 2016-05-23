angular
  .module('myApp', [
     'ngRoute',
	 'toastr'
  ])
.config(function($routeProvider){
	$routeProvider.when('/',{
		templateUrl: './templates/map.html',
		controller: 'mapController'
	})
	.when('/about',{
		templateUrl: './templates/about.html'
	})
	.when('/add',{
		templateUrl: './templates/add.html',
		controller: 'databaseController'
	})
	.when('/grafs',{
		templateUrl: './templates/grafs.html',
		controller: 'grafsController',
		cache: true
	})
	.when('/remove',{
		templateUrl:'./templates/remove.html',
		controller:'removeController'
	})
	.otherwise({
        redirectTo: '/'
      });
})
.value('databaseValue',{
	'database':[],
	'lastEditDatabase':{},
	'allTableData':{},
	'selectedGrafs':[],
	'googleMarkers':[],
	'valuesForMarkers':{},
	'makePdfValue':{
		info:{
			Title:'Моніторинг водних ресурсів Дніпропетровської області',
			author:"Нонг Хай Дінь,Заремська Марина Вікторівна,Дудник Олександр В'ячеславович",
			subject:""
		},
		pageSize:'A4',
		pageMargins:[113,75,38,75]
	}
})
.factory('Backendless',function($window,databaseValue,TableAndMarkerService){
	var APPLICATION_ID = '2511E1D8-07FE-B67C-FF38-AC567395C000';
    var SECRET_KEY = '1CEDA936-3700-0A8C-FFF1-3E264DD9DF00';
    var VERSION = 'v1';
	Backendless.serverURL = 'https://api.backendless.com';
	function init() {
        $window.Backendless.initApp(APPLICATION_ID, SECRET_KEY, VERSION);
    }
	init()
	// Backendless.UserService.login('eccodneprdiplom@ex.ua','dneprdiplom');
	databaseValue.database = TableAndMarkerService.fixServerData();
	return $window.Backendless
})
.factory('accessDatabaseService',function(Backendless,databaseValue,TableAndMarkerService,toastr){
	return {
		editData:editData	
	}
	function editData(){
		var BLTable = TableAndMarkerService.fixServerData();
		try {
			for (var i = 0; i < BLTable.data.length;i++){
				if(BLTable.data[i].dateData == databaseValue.lastEditDatabase.dateData.getTime() && BLTable.data[i].place == databaseValue.lastEditDatabase.place){
					BLTable.data[i].oil = databaseValue.lastEditDatabase.oil;
					BLTable.data[i].others = databaseValue.lastEditDatabase.others;
					BLTable.data[i].nitrogenAmmonia = databaseValue.lastEditDatabase.nitrogenAmmonia;
					BLTable.data[i].phosphates = databaseValue.lastEditDatabase.phosphates;
					BLTable.data[i].latitude = databaseValue.lastEditDatabase.latitude;
					BLTable.data[i].longitude = databaseValue.lastEditDatabase.longitude;
					Backendless.Persistence.of("ecoData").save(BLTable.data[i])
					toastr.success('Дані були оновлені')
					break;
				} else if (BLTable.data.length - 1 == i){
					Backendless.Persistence.of("ecoData").save(databaseValue.lastEditDatabase)
					toastr.success('Дані були додані')
				}
			}
			if (BLTable.data.length == 0){
				Backendless.Persistence.of("ecoData").save(databaseValue.lastEditDatabase)
				toastr.success('Дані були додані')
			}
			databaseValue.database = TableAndMarkerService.fixServerData();
			TableAndMarkerService.table()
		} catch (err){
			toastr.error('Сервер тимчасово недоступний','Помилка')
		}
	}
})
.factory('TableAndMarkerService',function(databaseValue){
	return {
		table:table,
		prepareDataGraf:prepareDataGraf,
		fixServerData:fixServerData,
		prepareDataDiag:prepareDataDiag
	}
	function table(){
		var BLTable = fixServerData();
		var mapPlace = {'Місяць':0};
		var currentIndexPlace = 1;
		var mapData = {};
		var currentIndexMap = 0;
		var res = {
			head:['Місяць'],
			phosphates:[],
			oil:[],
			others:[],
			nitrogenAmmonia:[]
		};
		for (var i = 0;i < BLTable.data.length;i++){
			if(!mapPlace[BLTable.data[i].place]){
				mapPlace[BLTable.data[i].place] = currentIndexPlace;
				res.head[mapPlace[BLTable.data[i].place]] = BLTable.data[i].place
				currentIndexPlace++;
				databaseValue.googleMarkers.push({
					position: {lat: +BLTable.data[i].latitude, lng: +BLTable.data[i].longitude},
					map: '',
					title: BLTable.data[i].place,
					icon:''
				});
				databaseValue.valuesForMarkers[BLTable.data[i].place] = [
					['Забруднююча речовина','(тонн / годину)'],
					['Амонійний азот',0],
					['Нафтопродукти',0],
					['Фосфати',0],
					['Інші',0]
				]
				
			}
			if(mapData[''+BLTable.data[i].dateData] == undefined){
				mapData[''+BLTable.data[i].dateData] = currentIndexMap;
				res.phosphates[mapData[''+BLTable.data[i].dateData]]=[];
				res.phosphates[mapData[''+BLTable.data[i].dateData]][0]=BLTable.data[i].dateData;
				res.nitrogenAmmonia[mapData[''+BLTable.data[i].dateData]]=[]
				res.nitrogenAmmonia[mapData[''+BLTable.data[i].dateData]][0]=BLTable.data[i].dateData;
				res.others[mapData[''+BLTable.data[i].dateData]]=[];
				res.others[mapData[''+BLTable.data[i].dateData]][0]=BLTable.data[i].dateData;
				res.oil[mapData[''+BLTable.data[i].dateData]]=[];
				res.oil[mapData[''+BLTable.data[i].dateData]][0]=BLTable.data[i].dateData;
				currentIndexMap++;
			}
			res.phosphates[mapData[''+BLTable.data[i].dateData]][mapPlace[''+BLTable.data[i].place]] = +BLTable.data[i].phosphates;
			res.oil[mapData[''+BLTable.data[i].dateData]][mapPlace[''+BLTable.data[i].place]] = +BLTable.data[i].oil;
			res.others[mapData[''+BLTable.data[i].dateData]][mapPlace[''+BLTable.data[i].place]] = +BLTable.data[i].others;
			res.nitrogenAmmonia[mapData[''+BLTable.data[i].dateData]][mapPlace[''+BLTable.data[i].place]] = +BLTable.data[i].nitrogenAmmonia;
		}
		
		databaseValue.allTableData = res;
	}
	function prepareDataGraf (key,fromData,toData){
		table();
		var mounth = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
		var bodyTable = databaseValue.allTableData[key];
		bodyTable.sort(function compareNumeric(a, b) {if (a[0] > b[0]) return 1; if (a[0] < b[0]) return -1;});
		var fromToData = [];
		if(fromData && !toData){
			var fromDate = fromData.getTime();
			for(var i = 0; i < bodyTable.length; i++){
				if(bodyTable[i][0] >= fromDate){
					fromToData.push(bodyTable[i]);
				}
			}
			bodyTable = fromToData;
		} else if (toData && !fromData){
			var toDate = toData.getTime() + 11000000;
			for(var i = 1; i < bodyTable.length; i++){
				if(bodyTable[i][0] <= toDate){
					fromToData.push(bodyTable[i]);
				}
			}
			bodyTable = fromToData;
		} else if(toData && fromData){
			var fromDate = fromData.getTime();
			var toDate = toData.getTime() + 11000000;
			for(var i = 1; i < bodyTable.length; i++){
				if(bodyTable[i][0] <= toDate && bodyTable[i][0] >= fromDate){
					fromToData.push(bodyTable[i]);
				}
			}
		} else {
			fromToData = bodyTable;
		}
		var showDate = new Date();
		var numberOfValues = databaseValue.allTableData.head.length;
		for(i = 0; i < fromToData.length;i++){
			
				for(j = 0; j < numberOfValues;j++){
					if(!fromToData[i][j]){
						fromToData[i][j] = 0;
					}
				}
			
		}
		for (i = 0;i < fromToData.length;i++){
			showDate.setTime(fromToData[i][0]);			
			fromToData[i][0] = mounth[showDate.getMonth()] +' '+ showDate.getFullYear();
		}
		fromToData.unshift(databaseValue.allTableData.head);
		databaseValue.selectedGrafs = fromToData;
	}
	function prepareDataDiag (fromData,toData) {
		var bodyTable = fixServerData();
		var fromToData = [];
		for (i = 0; i < bodyTable.data.length;i++){					
			databaseValue.valuesForMarkers[bodyTable.data[i].place][1][1] = 0;
			databaseValue.valuesForMarkers[bodyTable.data[i].place][2][1] = 0;
			databaseValue.valuesForMarkers[bodyTable.data[i].place][3][1] = 0;
			databaseValue.valuesForMarkers[bodyTable.data[i].place][4][1] = 0;
		}
		if(fromData && !toData){
			var fromDate = fromData.getTime();
			for(var i = 0; i < bodyTable.data.length; i++){
				if(+bodyTable.data[i].dateData >= fromDate){
					if(bodyTable.data[i].nitrogenAmmonia && bodyTable.data[i].oil && bodyTable.data[i].phosphates && bodyTable.data[i].others){
						databaseValue.valuesForMarkers[bodyTable.data[i].place][1][1] = +bodyTable.data[i].nitrogenAmmonia + databaseValue.valuesForMarkers[bodyTable.data[i].place][1][1];
						databaseValue.valuesForMarkers[bodyTable.data[i].place][2][1] = +bodyTable.data[i].oil + databaseValue.valuesForMarkers[bodyTable.data[i].place][2][1];
						databaseValue.valuesForMarkers[bodyTable.data[i].place][3][1] = +bodyTable.data[i].phosphates + databaseValue.valuesForMarkers[bodyTable.data[i].place][3][1];
						databaseValue.valuesForMarkers[bodyTable.data[i].place][4][1] = +bodyTable.data[i].others + databaseValue.valuesForMarkers[bodyTable.data[i].place][4][1];
					}
				}
			}
		} else if (toData && !fromData){
			var toDate = toData.getTime() + 11000000;
			for(var i = 0; i < bodyTable.data.length; i++){
				if(+bodyTable.data[i].dateData <= toDate){
					if(bodyTable.data[i].nitrogenAmmonia && bodyTable.data[i].oil && bodyTable.data[i].phosphates && bodyTable.data[i].others){
						databaseValue.valuesForMarkers[bodyTable.data[i].place][1][1] = +bodyTable.data[i].nitrogenAmmonia + databaseValue.valuesForMarkers[bodyTable.data[i].place][1][1];
						databaseValue.valuesForMarkers[bodyTable.data[i].place][2][1] = +bodyTable.data[i].oil + databaseValue.valuesForMarkers[bodyTable.data[i].place][2][1];
						databaseValue.valuesForMarkers[bodyTable.data[i].place][3][1] = +bodyTable.data[i].phosphates + databaseValue.valuesForMarkers[bodyTable.data[i].place][3][1];
						databaseValue.valuesForMarkers[bodyTable.data[i].place][4][1] = +bodyTable.data[i].others + databaseValue.valuesForMarkers[bodyTable.data[i].place][4][1];
					}
				}
			}
			bodyTable = fromToData;
		} else if(toData && fromData){
			var fromDate = fromData.getTime();
			var toDate = toData.getTime() + 11000000;
			for(var i = 0; i < bodyTable.data.length; i++){
				if(+bodyTable.data[i].dateData <= toDate && +bodyTable.data[i].dateData >= fromDate){
					if(bodyTable.data[i].nitrogenAmmonia && bodyTable.data[i].oil && bodyTable.data[i].phosphates && bodyTable.data[i].others){
						databaseValue.valuesForMarkers[bodyTable.data[i].place][1][1] = +bodyTable.data[i].nitrogenAmmonia + databaseValue.valuesForMarkers[bodyTable.data[i].place][1][1];
						databaseValue.valuesForMarkers[bodyTable.data[i].place][2][1] = +bodyTable.data[i].oil + databaseValue.valuesForMarkers[bodyTable.data[i].place][2][1];
						databaseValue.valuesForMarkers[bodyTable.data[i].place][3][1] = +bodyTable.data[i].phosphates + databaseValue.valuesForMarkers[bodyTable.data[i].place][3][1];
						databaseValue.valuesForMarkers[bodyTable.data[i].place][4][1] = +bodyTable.data[i].others + databaseValue.valuesForMarkers[bodyTable.data[i].place][4][1];
					}
				}
			}
		} else {
			for(var i = 0; i < bodyTable.data.length; i++){
					if(bodyTable.data[i].nitrogenAmmonia && bodyTable.data[i].oil && bodyTable.data[i].phosphates && bodyTable.data[i].others){
					databaseValue.valuesForMarkers[bodyTable.data[i].place][1][1] = +bodyTable.data[i].nitrogenAmmonia + databaseValue.valuesForMarkers[bodyTable.data[i].place][1][1];
					databaseValue.valuesForMarkers[bodyTable.data[i].place][2][1] = +bodyTable.data[i].oil + databaseValue.valuesForMarkers[bodyTable.data[i].place][2][1];
					databaseValue.valuesForMarkers[bodyTable.data[i].place][3][1] = +bodyTable.data[i].phosphates + databaseValue.valuesForMarkers[bodyTable.data[i].place][3][1];
					databaseValue.valuesForMarkers[bodyTable.data[i].place][4][1] = +bodyTable.data[i].others + databaseValue.valuesForMarkers[bodyTable.data[i].place][4][1];
				}
			}
		}
	}
	function fixServerData(){
		var query = new Backendless.DataQuery();
		query.options = {};
		query.options['pageSize'] = {};
		query.options['pageSize'] = 100;
		var res = Backendless.Persistence.of("ecoData").find(query);
		if(res.nextPage != null){
			var numberOfPages = 1;
			var currentPage = res.nextPage();
			for (i = 0;i < numberOfPages;i++){
				for (j = 0; j < currentPage.data.length;j++){
					res.data.push(currentPage.data[j])
					if(currentPage.nextPage != null){
						currentPage = currentPage.nextPage();
						numberOfPages = numberOfPages + 1;
					}
				}
			}	
		}
		return res
	}
})
.controller('mapController', function (databaseValue,TableAndMarkerService,Backendless,$scope,$rootScope) {
	var map;
	$scope.fromData = new Date();
	$scope.fromData.setTime(1451599200000);
	$scope.toData = new Date();
	$scope.toData.setTime(1482323413975);
	var mapStyle = [
		{
			"featureType": "administrative",
			"elementType": "labels.text.fill",
			"stylers": [
				{
					"color": "#444444"
				}
			]
		},
		{
			"featureType": "landscape",
			"elementType": "all",
			"stylers": [
				{
					"color": "#f2f2f2"
				}
			]
		},
		{
			"featureType": "poi",
			"elementType": "all",
			"stylers": [
				{
					"visibility": "off"
				}
			]
		},
		{
			"featureType": "road",
			"elementType": "all",
			"stylers": [
				{
					"saturation": -100
				},
				{
					"lightness": 45
				}
			]
		},
		{
			"featureType": "road.highway",
			"elementType": "all",
			"stylers": [
				{
					"visibility": "simplified"
				}
			]
		},
		{
			"featureType": "road.arterial",
			"elementType": "labels.icon",
			"stylers": [
				{
					"visibility": "off"
				}
			]
		},
		{
			"featureType": "transit",
			"elementType": "all",
			"stylers": [
				{
					"visibility": "off"
				}
			]
		},
		{
			"featureType": "water",
			"elementType": "all",
			"stylers": [
				{
					"color": "#46bcec"
				},
				{
					"visibility": "on"
				}
			]
		}
	]
	function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 48.464717, lng: 35.046183},
    zoom: 10
  });
  }
  var mounth = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
  $scope.$on('i am here',function(){
		TableAndMarkerService.prepareDataDiag($scope.fromData,$scope.toData);
		var pageDiag = document.getElementById('diagramma');
		var title = pageDiag.classList[0]
		var markerForPdf;
		for(i = 0;i < databaseValue.googleMarkers.length;i++){
			if(databaseValue.googleMarkers[i].title == title){
				markerForPdf = databaseValue.googleMarkers[i]
			}
		}
		
		try{
			google.charts.load("current", {packages:["corechart"]});
		}catch (err){
			
		}
		google.charts.setOnLoadCallback(drawChart);
		function drawChart() {
			var data = google.visualization.arrayToDataTable(databaseValue.valuesForMarkers[title]);

			var options = {
				legend: 'right',
				pieSliceText: 'label',
				pieStartAngle: 100
			};

			var chart = new google.visualization.PieChart(pageDiag);
			chart.draw(data, options);
			var prepPdf = databaseValue.valuesForMarkers[title].slice(0);
			for(i = 1;i < prepPdf.length;i++){
				prepPdf[i][1] = prepPdf[i][1].toString()
			}
			var lat = markerForPdf.position.lat + '';
			lat = lat.split('.').join('°')+'’'
			var lng = markerForPdf.position.lng + '';
			lng = lng.split('.').join('°')+'’';
			var fromDate = $scope.fromData.getTime();
			var toDate = $scope.toData.getTime() + 11000000;
			var tableForPdf = [
			[ { text: 'Місяць', bold: true },{ text: 'Амонійний азот (тонн / годину)', bold: true },{ text: 'Фосфати (тонн / годину)', bold: true },{ text: 'Нафтопродукти (тонн / годину)', bold: true },{ text: 'Інші (тонн / годину)', bold: true }]
			] 
			var total = [0,0,0,0];
			var bodyForPdf = []
			for(i = 0;i< databaseValue.database.data.length;i++){
				if(title == databaseValue.database.data[i].place && fromDate <= databaseValue.database.data[i].dateData && toDate >= databaseValue.database.data[i].dateData){
					bodyForPdf.push([databaseValue.database.data[i].dateData,databaseValue.database.data[i].nitrogenAmmonia,databaseValue.database.data[i].phosphates,databaseValue.database.data[i].oil,databaseValue.database.data[i].others])
				}
			}
			bodyForPdf.sort(function compareNumeric(a, b) {if (a[0] > b[0]) return 1; if (a[0] < b[0]) return -1;});
			for (i = 0;i < bodyForPdf.length;i++){
				var dateFromData = new Date();
				dateFromData.setTime(bodyForPdf[i][0]);
				bodyForPdf[i][0] = '' + mounth[dateFromData.getMonth()] + ' ' + dateFromData.getFullYear ()
			}
			for(i = 0;i < tableForPdf.length;i++){
				total[0] = +bodyForPdf[i][1] + total[0];
				total[1] = +bodyForPdf[i][2] + total[1];
				total[2] = +bodyForPdf[i][3] + total[2];
				total[3] = +bodyForPdf[i][4] + total[3];
			}
			bodyForPdf.unshift(tableForPdf[0])
				bodyForPdf.push([
									{ text: 'РАЗОМ', bold: true },
									{ text: '' + total[0], bold: true },
									{ text: '' + total[1], bold: true },
									{ text: '' + total[2], bold: true },
									{ text: '' + total[3], bold: true }
								])
			databaseValue.makePdfValue['content'] = [
				 {
					text:'Звіт про кількість скинутих забруднюючих речовин',
					alignment: 'left',
					bold: true,
					margin:[0,0,0,30],
					fontSize:16
				},		
				 {
					text:'За період: '+mounth[$scope.fromData.getMonth()]+' ' + $scope.fromData.getFullYear() + ' - ' +mounth[$scope.toData.getMonth()]+' ' + $scope.toData.getFullYear(),
					margin:[0,0,0,10],
					alignment: 'left'
				},
				 {
					text:'Назва об\'екта промисловості: "' + title + '"',
					margin:[0,0,0,10],
					alignment: 'left'
				},
				 {
					text:'Координати об\'єкту: ' + 'широта '+ lat +', довгота ' + lng,
					margin:[0,0,0,10],
					alignment: 'left'
				},
				// {
					// image: chart.getImageURI(),
					// width: 550,
					// height: 350
				// },
				{
					table:{
						widths:['*','*','*','*','*'],
						body:bodyForPdf
					},
					fontSize:10,
					margin:[0,0,38,10],
				}
			]
			var href = document.createElement('a');
			href.innerText = 'Завантажити PDF'
			href.onclick = function(){
				pdfMake.createPdf(databaseValue.makePdfValue).download(title+'.pdf')
			};
			href.className = "btn btn-primary",
			pageDiag.appendChild(href);
		}
  })
  TableAndMarkerService.table();
  $scope.changeDiag = function (){
		TableAndMarkerService.prepareDataDiag($scope.fromData,$scope.toData);
  }
  initMap()
  map.setOptions({styles: mapStyle});
   var imageFactory = 'img/Zavod.png';
   var settedMarkers = [];
   var markPage = [];
     for(var i = 0; i < databaseValue.googleMarkers.length;i++){
		var contentString = '<div id="diagramma" class="'+databaseValue.googleMarkers[i].title+'" style="width:550px;height:auto;min-height:350px"></div>';
		databaseValue.googleMarkers[i].map = map;
		databaseValue.googleMarkers[i].icon = imageFactory;
		var infowindow = new google.maps.InfoWindow({
			content: contentString
		});
		$scope["marker"+i] = new google.maps.Marker(databaseValue.googleMarkers[i]);
		$scope["marker"+i].content = infowindow
		$scope["marker"+i].addListener('click', function() {
			this.content.open(map, this);
			$rootScope.$broadcast('i am here',this)
		})
	}

})
.controller('databaseController',function($scope,databaseValue,Backendless,accessDatabaseService,TableAndMarkerService){
	$scope.edit = function(){
		databaseValue.lastEditDatabase = {
			dateData: ecoForm.dateData.valueAsDate,
			place:ecoForm.place.value,
			phosphates:ecoForm.phosphates.value,
			nitrogenAmmonia:ecoForm.nitrogenAmmonia.value,
			oil:ecoForm.oil.value,
			others:ecoForm.others.value,
			latitude:ecoForm.latitude.value,
			longitude:ecoForm.longitude.value	
		}
		accessDatabaseService.editData()
		ecoForm.dateData.value = '';
		ecoForm.place.value = '';
		phosphates:ecoForm.phosphates.value = '';
		ecoForm.nitrogenAmmonia.value = '';
		ecoForm.oil.value = '';
		ecoForm.others.value = '';
		ecoForm.latitude.value = '';
		ecoForm.longitude.value = '';
	}
})
.controller('grafsController',function($scope,TableAndMarkerService,databaseValue,Backendless){
	$scope.fromData = new Date();
	$scope.fromData.setTime(1451599200000);
	$scope.toData = new Date();
	$scope.toData.setTime(1482323413975);
	try{
		google.charts.load('current', {'packages':['corechart']});
    } catch (err){
		
	} 
	var lastGraf = "nitrogenAmmonia";
	google.charts.setOnLoadCallback(drawChart);
	TableAndMarkerService.table()
	TableAndMarkerService.prepareDataGraf("nitrogenAmmonia");
	$scope.changeElement = function(index){
		var variable = index;
		if (variable){
			lastGraf = variable;
		} else {
			variable = lastGraf;
		}
		TableAndMarkerService.prepareDataGraf(variable,$scope.fromData,$scope.toData)
		drawChart()
	}
	function drawChart() {
		var data = google.visualization.arrayToDataTable(databaseValue.selectedGrafs);

		var options = {
			title: '',
			legend: { position: 'right' }
		};

		var chart = new google.visualization.LineChart(document.getElementById('curve_chart'));

		chart.draw(data, options);
	}
	changeElement();
})
.controller('removeController',function($scope,TableAndMarkerService,databaseValue,Backendless,toastr){
	$scope.database = TableAndMarkerService.fixServerData();
	$scope.remove = function (item) {
		try{
		Backendless.Persistence.of('ecoData').remove(item);
		} catch (err){
			toastr.error('Сервер тимчасово недоступний')
			return
		}
		$scope.database = TableAndMarkerService.fixServerData();
		toastr.success('Данні були видаленні');
	}
})
