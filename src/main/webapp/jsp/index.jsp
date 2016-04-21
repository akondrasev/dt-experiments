<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page isELIgnored="false" %>
<html>
<head>
    <title>DataTables</title>


    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/DataTables/datatables.css"/>
    <script type="text/javascript" src="${pageContext.request.contextPath}/DataTables/datatables.js"></script>
    <script type="text/javascript" src="${pageContext.request.contextPath}/DataTables/dataTables.colResize.js"></script>
    <script type="text/javascript"
            src="${pageContext.request.contextPath}/DataTables/jquery.dataTables.yadcf.js"></script>

    <link rel="stylesheet" type="text/css" href="${pageContext.request.contextPath}/css/table.css"/>

</head>
<body>
<div class="container">
    <table class="display"></table>
</div>



<script type="application/javascript">
    var staticData = [
        {
        partyName   : "Party Name",
        partyAddress: "address",
        partyDate   : "Date",
        partyId     : "ID"
    }, {
        partyName   : "Party Name",
        partyAddress: "address",
        partyDate   : "Date",
        partyId     : "ID"
    }, {
        partyName   : "Party Name",
        partyAddress: "address",
        partyDate   : "Date",
        partyId     : "ID"
    }, {
        partyName   : "Party Name",
        partyAddress: "address",
        partyDate   : "Date",
        partyId     : "ID"
    }, {
        partyName   : "Party Name",
        partyAddress: "address",
        partyDate   : "Date",
        partyId     : "ID"
    }, {
        partyName   : "Party Name",
        partyAddress: "address",
        partyDate   : "Date",
        partyId     : "ID"
    }, {
        partyName   : "Party Name",
        partyAddress: "address",
        partyDate   : "Date",
        partyId     : "ID"
    }, {
        partyName   : "Party Name",
        partyAddress: "address",
        partyDate   : "Date",
        partyId     : "ID"
    }];

</script>
<script type="application/javascript" src="${pageContext.request.contextPath}/js/main.js"></script>

</body>
</html>
