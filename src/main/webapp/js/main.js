$("table").dataTable({
    data        : staticData,
    columns     : [
        {"data": "partyName", title: "Name", width: 200, type: "text"},
        {"data": "partyAddress", title: "Address", width: 200, type: "text"},
        {"data": "partyDate", title: "Date", width: 100, type: "text"},
        {"data": "partyId", title: "Delete", width: 100, type: "text"}
    ],
    dom         : '<"table-container"rtZ>',
    colResize   : {
        tableWidthFixed: false
    },
    fixedColumns: false,
    colReorder  : false,
    autoWidth   : false,
    scrollX     : 150,
    scrollY     : "150px",
    scrollCollapse: true,
    select      : {
        info : false,
        style: "os"
    }
});