como usuario admin y asistente de liquidación quiero desde el modulo de preliquidación poder rezagar o liquidar preliquidación para que queden aplicadas a los coach.

#Resagados.  
  El usuario va poder seleccinar las preliquidaciones por medio de un checkbox, si le da en el boton de rezagar, la comisiones de settlement_commission van a ser actualizados en el status 
  LAG y cambos isLag en true, para que luego se pueda agrega a una liquidación previa.                                                                                                                                                              

#Liquidación.                            
  EL usuario selecciona las preliquidaciones disponibles por  medio de un checkbox, si le da en el boton de liquidar va pasar los siguiente.                                                                                                                                                                                                                                                                                                              
  Voluntarias                                                                                                                                                                                                                              
  **aplicar cambios en settementment_commision**
   - status a 'SETTLED'
   - ADD: agregar campo settlement_date, agregar la fecha de liquidación.
  **aplicar cambios en commission_distribution**
   - status a 'SETTLED'
   - ADD: agregar campo settlement_date, agregar la fecha de liquidación.


  Polizas
  **aplicar cambios en settementment_commision**
   - status a 'SETTLED'
   - ADD: agregar campo settlement_date, agregar la fecha de liquidación.
  **aplicar cambios en commission_distribution**
   - status a 'SETTLED'
   - ADD: agregar campo settlement_date, agregar la fecha de liquidación.
    **aplicar cambios en clawback**
   - ADD: agregar campo applied_date, agregar la fecha de aplicación.
   - ADD: agregar campo release_date, agregar la fecha de liberación.
   - Sumar el valor del clowback a el balance de clawback de la tabla clawback_balance.
    - Debe aplicarlo para el usuario dueño del negocio. y sus usuarios subordinados. buscar user_leader en la tabla user. y aplicar el valor al balance de clawback de los usuarios subordinados.
    - Cada categoria de distribución debe tener un clawback y ser actualizado en la tabla clawback

    **aplicar cambios en clawback_balance**
    - Sumar el valor del clawback a el balance de clawback de la tabla clawback_balance. si el registro del clawback es 

