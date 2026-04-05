como usuario admin y asistente de liquidación quiero desde el modulo de preliquidación poder rezagar o liquidar preliquidación para que queden aplicadas la liquidacion y la distribución.

#Resagados.  
  El usuario va poder seleccinar las preliquidaciones por medio de un checkbox, si le da en el boton de rezagar, la comisiones de settlement_commission van a ser actualizados en el status 
  LAG y cambos isLagByUser en true, (agregar este nuevo campo en la base de datos), porner isLag en true y agregar isLagByUserDate para registar la fecha que el usuario lo agego como lag, que luego se pueda agrega a una liquidación previa.                                                                                                                                                              

#Liquidación.                            
  EL usuario selecciona las preliquidaciones disponibles por  medio de un checkbox, si le da en el boton de liquidar va pasar los siguiente.                                                                                                                                                                                                                                                                                                              
  Voluntarias                                                                                                                                                                                                                              
  **aplicar cambios en settementment_commision**
   - status a 'SETTLED'
   - actualiza el campo settled_data para registar la fecha que fue liquidado
  **aplicar cambios en commission_distribution**
   - status a 'SETTLED'


  Polizas
  **aplicar cambios en settementment_commision**
   - status a 'SETTLED'
   - actualiza el campo settled_data para registar la fecha que fue liquidado
  **aplicar cambios en commission_distribution**
   - status a 'SETTLED'
    **aplicar cambios en clawback**
   - actualizar la fecha de applied_date
   - agregar en el campo reason, retencion del clawback de la poliza
   - Sumar el valor del clowback a el balance de clawback de la tabla clawback_balance.
    -debe aplicarlo para todas las distribuciones que le pertenecen a esa cmision, 

    **aplicar cambios en clawback_balance**
    - Sumar el valor del clawback a el balance de clawback de la tabla clawback_balance, sumando a el total_amount el valor retienido del clawback


    Requisitos generales.
    - Si el usuario termina de liuidar o rezagar todo las comisiones del archivo, pasa el estado del import File en 'COMPLETED'
    - si el negocio a liquidar esta en 'EMITIDO' pasa a el estado en 'COMISIONANDO'.
    - la tabla de lista de negocios debe presentar ese nuevo estado.

